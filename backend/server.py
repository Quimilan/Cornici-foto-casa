import os
import io
import uuid
import asyncio
import logging
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Optional

import requests
from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Header, Query
from fastapi.responses import Response, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from PIL import Image, ImageOps, ImageEnhance, ImageDraw, ImageFont, ImageCms

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# ---------------------------------------------------------------------------
# Object storage
# ---------------------------------------------------------------------------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "collagestudio"
USER_ID = "studio"  # single-user app for now

storage_key = None
logger = logging.getLogger(__name__)


def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=180,
    )
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=180,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> tuple[bytes, str]:
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=120)
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=120)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


MIME_TYPES = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}

FONT_DIR = ROOT_DIR / "fonts"
FONT_FILES = {
    "playfair": str(FONT_DIR / "PlayfairDisplay.ttf"),
    "cormorant": str(FONT_DIR / "CormorantGaramond.ttf"),
    "montserrat": str(FONT_DIR / "Montserrat.ttf"),
    "dancing": str(FONT_DIR / "DancingScript.ttf"),
    "inter": str(FONT_DIR / "Inter.ttf"),
}

PROFILE_DIR = ROOT_DIR / "profiles"
CMYK_PROFILE_PATH = PROFILE_DIR / "CoatedFOGRA39.icc"
_cmyk_transform = None


def get_cmyk_transform():
    """Lazily build & cache the sRGB -> Coated FOGRA39 transform. Returns (transform, icc_bytes)."""
    global _cmyk_transform
    if _cmyk_transform is None:
        try:
            prof = ImageCms.getOpenProfile(str(CMYK_PROFILE_PATH))
            srgb = ImageCms.createProfile("sRGB")
            tf = ImageCms.buildTransform(srgb, prof, "RGB", "CMYK", renderingIntent=ImageCms.Intent.PERCEPTUAL)
            _cmyk_transform = (tf, CMYK_PROFILE_PATH.read_bytes())
            logger.info("CMYK FOGRA39 profile loaded")
        except Exception as e:
            logger.error(f"CMYK profile load failed: {e}")
            _cmyk_transform = (None, None)
    return _cmyk_transform


def to_cmyk(img: Image.Image, use_icc: bool = True) -> Image.Image:
    img = img.convert("RGB")
    if use_icc:
        tf, icc = get_cmyk_transform()
        if tf is not None:
            out = ImageCms.applyTransform(img, tf)
            if icc:
                out.info["icc_profile"] = icc
            return out
    return img.convert("CMYK")

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class PhotoOut(BaseModel):
    id: str
    storage_path: str
    original_filename: str
    content_type: str
    width: int
    height: int
    size: int
    created_at: str


class FormatSpec(BaseModel):
    w_cm: float
    h_cm: float


class FrameSpec(BaseModel):
    enabled: bool = True
    color: str = "#121212"
    width_cm: float = 2.0


class MatSpec(BaseModel):
    enabled: bool = True
    color: str = "#FFFFFF"
    width_cm: float = 3.0


class CellSpec(BaseModel):
    x: float
    y: float
    w: float
    h: float
    photoId: Optional[str] = None
    zoom: float = 1.0
    offsetX: float = 0.0
    offsetY: float = 0.0
    filter: str = "none"
    rotation: float = 0.0


class TextSpec(BaseModel):
    id: Optional[str] = None
    content: str = ""
    x: float = 0.5          # fraction of canvas width (center anchor)
    y: float = 0.5          # fraction of canvas height (center anchor)
    size_cm: float = 1.2
    color: str = "#18181A"
    font: str = "playfair"
    align: str = "center"
    rotation: float = 0.0
    letter_spacing: float = 0.0


class CollageSpec(BaseModel):
    format: FormatSpec
    dpi: int = 300
    frame: FrameSpec = Field(default_factory=FrameSpec)
    mat: MatSpec = Field(default_factory=MatSpec)
    gap_cm: float = 0.4
    corner_radius_cm: float = 0.0
    background_color: str = "#FFFFFF"
    cells: List[CellSpec] = Field(default_factory=list)
    texts: List[TextSpec] = Field(default_factory=list)


class ProjectIn(BaseModel):
    name: str
    formatId: str
    orientation: str
    layoutKey: str
    spec: CollageSpec


class ProjectOut(ProjectIn):
    id: str
    created_at: str
    updated_at: str


class ExportRequest(BaseModel):
    spec: CollageSpec
    fmt: str = "jpg"  # jpg | pdf | png
    filename: str = "collage"
    paper: Optional[FormatSpec] = None   # None => usa il formato del collage
    bleed_mm: float = 0.0
    cmyk: bool = False
    icc: bool = True
    crop_marks: bool = False
    page_bg: str = "#FFFFFF"


# ---------------------------------------------------------------------------
# Rendering helpers
# ---------------------------------------------------------------------------
def cm_to_px(cm: float, dpi: int) -> int:
    return max(1, round(cm / 2.54 * dpi))


def hex_to_rgb(h: str) -> tuple:
    h = (h or "#000000").lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def apply_filter(img: Image.Image, name: str) -> Image.Image:
    if name == "none" or not name:
        return img
    if name == "bw":
        return ImageOps.grayscale(img).convert("RGB")
    if name == "sepia":
        gray = ImageOps.grayscale(img)
        return ImageOps.colorize(gray, black=(30, 20, 10), white=(255, 240, 200)).convert("RGB")
    if name == "vivid":
        img = ImageEnhance.Color(img).enhance(1.45)
        return ImageEnhance.Contrast(img).enhance(1.12)
    if name == "warm":
        r, g, b = img.split()[:3]
        r = r.point(lambda p: min(255, int(p * 1.12)))
        b = b.point(lambda p: int(p * 0.9))
        return Image.merge("RGB", (r, g, b))
    if name == "cool":
        r, g, b = img.split()[:3]
        b = b.point(lambda p: min(255, int(p * 1.12)))
        r = r.point(lambda p: int(p * 0.92))
        return Image.merge("RGB", (r, g, b))
    return img


_img_cache: dict = {}


def load_photo(photo_path: str) -> Image.Image:
    if photo_path in _img_cache:
        return _img_cache[photo_path]
    data, _ = get_object(photo_path)
    img = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img).convert("RGB")
    _img_cache[photo_path] = img
    return img


async def resolve_photo_path(photo_id: str) -> Optional[str]:
    rec = await db.photos.find_one({"id": photo_id, "is_deleted": False})
    return rec["storage_path"] if rec else None


def render_cell(img: Image.Image, cw: int, ch: int, zoom: float, offx: float, offy: float, filt: str, rotation: float = 0.0) -> Image.Image:
    if rotation:
        img = img.rotate(-rotation, expand=True, resample=Image.BICUBIC)
    iw, ih = img.size
    cover = max(cw / iw, ch / ih)
    scale = cover * max(zoom, 0.05)
    dw, dh = max(1, round(iw * scale)), max(1, round(ih * scale))
    resized = img.resize((dw, dh), Image.LANCZOS)
    px = (cw - dw) / 2 + offx * (dw - cw) / 2
    py = (ch - dh) / 2 + offy * (dh - ch) / 2
    cell = Image.new("RGB", (cw, ch), (238, 238, 238))
    cell.paste(resized, (round(px), round(py)))
    return apply_filter(cell, filt)


def _text_image(text: str, font: "ImageFont.FreeTypeFont", color_rgb: tuple, spacing_px: float) -> Image.Image:
    if not text:
        text = " "
    ascent, descent = font.getmetrics()
    widths = [font.getlength(c) for c in text]
    total_w = sum(widths) + spacing_px * max(0, len(text) - 1)
    h = ascent + descent
    pad = max(6, int(h * 0.2))
    img = Image.new("RGBA", (int(total_w) + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    x = pad
    for c, w in zip(text, widths):
        d.text((x, pad), c, font=font, fill=color_rgb + (255,))
        x += w + spacing_px
    return img


def draw_texts(canvas: Image.Image, texts, dpi: int):
    W, H = canvas.size
    for t in texts:
        if not (t.content or "").strip():
            continue
        path = FONT_FILES.get(t.font, FONT_FILES["playfair"])
        size_px = max(8, cm_to_px(t.size_cm, dpi))
        try:
            font = ImageFont.truetype(path, size_px)
        except Exception:
            font = ImageFont.truetype(FONT_FILES["inter"], size_px)
        spacing_px = t.letter_spacing * size_px
        timg = _text_image(t.content, font, hex_to_rgb(t.color), spacing_px)
        if t.rotation:
            timg = timg.rotate(-t.rotation, expand=True, resample=Image.BICUBIC)
        cx, cy = round(t.x * W), round(t.y * H)
        canvas.paste(timg, (cx - timg.width // 2, cy - timg.height // 2), timg)


async def build_collage(spec: CollageSpec) -> Image.Image:
    dpi = spec.dpi
    W = cm_to_px(spec.format.w_cm, dpi)
    H = cm_to_px(spec.format.h_cm, dpi)

    frame_c = hex_to_rgb(spec.frame.color) if spec.frame.enabled else hex_to_rgb(spec.background_color)
    canvas = Image.new("RGB", (W, H), frame_c)

    fw = cm_to_px(spec.frame.width_cm, dpi) if spec.frame.enabled else 0
    mw = cm_to_px(spec.mat.width_cm, dpi) if spec.mat.enabled else 0

    # mat rectangle
    mat_x0, mat_y0 = fw, fw
    mat_x1, mat_y1 = W - fw, H - fw
    if spec.mat.enabled:
        draw = ImageDraw.Draw(canvas)
        draw.rectangle([mat_x0, mat_y0, mat_x1, mat_y1], fill=hex_to_rgb(spec.mat.color))

    # content area (inside frame + mat)
    cx0, cy0 = fw + mw, fw + mw
    content_w = W - 2 * (fw + mw)
    content_h = H - 2 * (fw + mw)

    # background under photos
    bg = hex_to_rgb(spec.background_color)
    ImageDraw.Draw(canvas).rectangle([cx0, cy0, cx0 + content_w, cy0 + content_h], fill=bg)

    gap = cm_to_px(spec.gap_cm, dpi)
    radius = cm_to_px(spec.corner_radius_cm, dpi) if spec.corner_radius_cm > 0 else 0

    for cell in spec.cells:
        rx = round(cx0 + cell.x * content_w + gap / 2)
        ry = round(cy0 + cell.y * content_h + gap / 2)
        rw = max(1, round(cell.w * content_w - gap))
        rh = max(1, round(cell.h * content_h - gap))
        if not cell.photoId:
            continue
        path = await resolve_photo_path(cell.photoId)
        if not path:
            continue
        img = load_photo(path)
        cell_img = render_cell(img, rw, rh, cell.zoom, cell.offsetX, cell.offsetY, cell.filter, cell.rotation)
        if radius > 0:
            mask = Image.new("L", (rw, rh), 0)
            ImageDraw.Draw(mask).rounded_rectangle([0, 0, rw - 1, rh - 1], radius=radius, fill=255)
            canvas.paste(cell_img, (rx, ry), mask)
        else:
            canvas.paste(cell_img, (rx, ry))

    draw_texts(canvas, spec.texts, dpi)
    return canvas


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "Collage Studio API"}


SAMPLE_URLS = [
    "https://images.unsplash.com/photo-1522743791393-522312deeebf?crop=entropy&cs=srgb&fm=jpg&q=90&w=1600",
    "https://images.unsplash.com/photo-1738844153732-a485f0e78382?crop=entropy&cs=srgb&fm=jpg&q=90&w=1600",
    "https://images.unsplash.com/photo-1619857121838-997e82345250?crop=entropy&cs=srgb&fm=jpg&q=90&w=1600",
    "https://images.unsplash.com/photo-1496865534669-25ec2a3a0fd3?crop=entropy&cs=srgb&fm=jpg&q=90&w=1600",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?crop=entropy&cs=srgb&fm=jpg&q=90&w=1600",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?crop=entropy&cs=srgb&fm=jpg&q=90&w=1600",
]


@api_router.post("/import-samples", response_model=List[PhotoOut])
async def import_samples():
    existing = await db.photos.find({"is_deleted": False, "is_sample": True}, {"_id": 0, "is_deleted": 0}).to_list(100)
    if existing:
        return existing
    out = []
    for url in SAMPLE_URLS:
        try:
            r = requests.get(url, timeout=30)
            r.raise_for_status()
            data = r.content
            probe = ImageOps.exif_transpose(Image.open(io.BytesIO(data)))
            w, h = probe.size
            path = f"{APP_NAME}/uploads/{USER_ID}/{uuid.uuid4()}.jpg"
            result = put_object(path, data, "image/jpeg")
            doc = {
                "id": str(uuid.uuid4()),
                "storage_path": result["path"],
                "original_filename": "esempio.jpg",
                "content_type": "image/jpeg",
                "width": w, "height": h,
                "size": result.get("size", len(data)),
                "is_deleted": False, "is_sample": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.photos.insert_one(doc)
            doc.pop("_id", None); doc.pop("is_deleted", None); doc.pop("is_sample", None)
            out.append(doc)
        except Exception as e:
            logger.warning(f"sample import failed {url}: {e}")
    return out


@api_router.post("/upload", response_model=PhotoOut)
async def upload(file: UploadFile = File(...)):
    data = await file.read()
    try:
        probe = Image.open(io.BytesIO(data))
        probe = ImageOps.exif_transpose(probe)
        width, height = probe.size
    except Exception:
        raise HTTPException(status_code=400, detail="File immagine non valido")

    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "jpg"
    if ext not in MIME_TYPES:
        ext = "jpg"
    path = f"{APP_NAME}/uploads/{USER_ID}/{uuid.uuid4()}.{ext}"
    content_type = file.content_type or MIME_TYPES[ext]
    result = put_object(path, data, content_type)

    doc = {
        "id": str(uuid.uuid4()),
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "width": width,
        "height": height,
        "size": result.get("size", len(data)),
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.photos.insert_one(doc)
    doc.pop("_id", None)
    doc.pop("is_deleted", None)
    return doc


@api_router.get("/photos", response_model=List[PhotoOut])
async def list_photos():
    photos = await db.photos.find({"is_deleted": False}, {"_id": 0, "is_deleted": 0}).sort("created_at", -1).to_list(1000)
    return photos


@api_router.delete("/photos/{photo_id}")
async def delete_photo(photo_id: str):
    await db.photos.update_one({"id": photo_id}, {"$set": {"is_deleted": True}})
    return {"ok": True}


_bytes_cache: dict = {}


@api_router.get("/file/{photo_id}")
async def serve_file(photo_id: str):
    rec = await db.photos.find_one({"id": photo_id, "is_deleted": False})
    if not rec:
        raise HTTPException(status_code=404, detail="File non trovato")
    path = rec["storage_path"]
    if path in _bytes_cache:
        data, content_type = _bytes_cache[path]
    else:
        data, content_type = await asyncio.to_thread(get_object, path)
        content_type = rec.get("content_type", content_type)
        _bytes_cache[path] = (data, content_type)
    return Response(
        content=data,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@api_router.post("/projects", response_model=ProjectOut)
async def save_project(project: ProjectIn):
    now = datetime.now(timezone.utc).isoformat()
    doc = project.model_dump()
    doc.update({"id": str(uuid.uuid4()), "created_at": now, "updated_at": now})
    await db.projects.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/projects", response_model=List[ProjectOut])
async def list_projects():
    projects = await db.projects.find({}, {"_id": 0}).sort("updated_at", -1).to_list(500)
    return projects


@api_router.get("/projects/{project_id}", response_model=ProjectOut)
async def get_project(project_id: str):
    rec = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not rec:
        raise HTTPException(status_code=404, detail="Progetto non trovato")
    return rec


@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    await db.projects.delete_one({"id": project_id})
    return {"ok": True}


def fit_on_page(collage: Image.Image, page_w: int, page_h: int, bg: tuple) -> Image.Image:
    iw, ih = collage.size
    scale = min(page_w / iw, page_h / ih)
    nw, nh = max(1, round(iw * scale)), max(1, round(ih * scale))
    resized = collage.resize((nw, nh), Image.LANCZOS)
    page = Image.new("RGB", (page_w, page_h), bg)
    page.paste(resized, ((page_w - nw) // 2, (page_h - nh) // 2))
    return page


def add_bleed(img: Image.Image, b: int) -> Image.Image:
    if b <= 0:
        return img
    pw, ph = img.size
    canvas = Image.new(img.mode, (pw + 2 * b, ph + 2 * b))
    canvas.paste(img, (b, b))
    left = img.crop((0, 0, 1, ph)).resize((b, ph))
    right = img.crop((pw - 1, 0, pw, ph)).resize((b, ph))
    top = img.crop((0, 0, pw, 1)).resize((pw, b))
    bottom = img.crop((0, ph - 1, pw, ph)).resize((pw, b))
    canvas.paste(left, (0, b)); canvas.paste(right, (b + pw, b))
    canvas.paste(top, (b, 0)); canvas.paste(bottom, (b, b + ph))
    canvas.paste(img.crop((0, 0, 1, 1)).resize((b, b)), (0, 0))
    canvas.paste(img.crop((pw - 1, 0, pw, 1)).resize((b, b)), (b + pw, 0))
    canvas.paste(img.crop((0, ph - 1, 1, ph)).resize((b, b)), (0, b + ph))
    canvas.paste(img.crop((pw - 1, ph - 1, pw, ph)).resize((b, b)), (b + pw, b + ph))
    return canvas


def add_crop_marks(bled: Image.Image, bleed_px: int, trim_w: int, trim_h: int, dpi: int) -> Image.Image:
    mark_len = max(8, round(4 / 25.4 * dpi))       # 4 mm marks
    thick = max(2, round(dpi / 300 * 2))
    margin = mark_len + thick + round(1 / 25.4 * dpi)
    pw, ph = bled.size
    W, H = pw + 2 * margin, ph + 2 * margin
    canvas = Image.new("RGB", (W, H), (255, 255, 255))
    canvas.paste(bled, (margin, margin))
    d = ImageDraw.Draw(canvas)
    col = (0, 0, 0)
    # trim corners in canvas coordinates
    x0, y0 = margin + bleed_px, margin + bleed_px
    x1, y1 = x0 + trim_w, y0 + trim_h
    ht = thick // 2

    def vseg(x, ya, yb):
        d.rectangle([x - ht, ya, x - ht + thick - 1, yb], fill=col)

    def hseg(y, xa, xb):
        d.rectangle([xa, y - ht, xb, y - ht + thick - 1], fill=col)

    inner_gap = bleed_px  # marks sit just outside the bleed
    # top-left
    vseg(x0, y0 - inner_gap - mark_len, y0 - inner_gap)
    hseg(y0, x0 - inner_gap - mark_len, x0 - inner_gap)
    # top-right
    vseg(x1, y0 - inner_gap - mark_len, y0 - inner_gap)
    hseg(y0, x1 + inner_gap, x1 + inner_gap + mark_len)
    # bottom-left
    vseg(x0, y1 + inner_gap, y1 + inner_gap + mark_len)
    hseg(y1, x0 - inner_gap - mark_len, x0 - inner_gap)
    # bottom-right
    vseg(x1, y1 + inner_gap, y1 + inner_gap + mark_len)
    hseg(y1, x1 + inner_gap, x1 + inner_gap + mark_len)
    return canvas


@api_router.post("/export")
async def export_collage(req: ExportRequest):
    try:
        img = await build_collage(req.spec)
        dpi = req.spec.dpi
        # Place onto chosen paper format (contain) if provided
        if req.paper is not None:
            pw = cm_to_px(req.paper.w_cm, dpi)
            ph = cm_to_px(req.paper.h_cm, dpi)
            img = fit_on_page(img, pw, ph, hex_to_rgb(req.page_bg))
        trim_w, trim_h = img.size
        # Professional bleed (edge extension)
        bleed_px = max(1, round(req.bleed_mm / 25.4 * dpi)) if (req.bleed_mm and req.bleed_mm > 0) else 0
        if bleed_px:
            img = add_bleed(img, bleed_px)
        # Crop / trim marks for the print shop
        if req.crop_marks:
            img = add_crop_marks(img, bleed_px, trim_w, trim_h, dpi)
    except Exception as e:
        logger.exception("export failed")
        raise HTTPException(status_code=500, detail=f"Errore rendering: {e}")

    buf = io.BytesIO()
    fmt = req.fmt.lower()
    if fmt == "pdf":
        if req.cmyk:
            out = to_cmyk(img, use_icc=req.icc)
            icc = out.info.get("icc_profile")
            if icc:
                out.save(buf, "PDF", resolution=float(dpi), icc_profile=icc)
            else:
                out.save(buf, "PDF", resolution=float(dpi))
        else:
            img.convert("RGB").save(buf, "PDF", resolution=float(dpi))
        media, ext = "application/pdf", "pdf"
    elif fmt == "png":
        img.save(buf, "PNG", dpi=(dpi, dpi))
        media, ext = "image/png", "png"
    else:
        img.save(buf, "JPEG", quality=95, dpi=(dpi, dpi), subsampling=0)
        media, ext = "image/jpeg", "jpg"
    buf.seek(0)
    safe = "".join(c for c in req.filename if c.isalnum() or c in "-_") or "collage"
    headers = {"Content-Disposition": f'attachment; filename="{safe}.{ext}"'}
    return StreamingResponse(buf, media_type=media, headers=headers)


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


@app.on_event("startup")
async def startup():
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
