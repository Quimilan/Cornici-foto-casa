"""Iteration 5: Per-cell aspect (1:1, 4:3, 3:2, 3:4, 2:3, fill) tests for /api/export."""
import os
import io
import pytest
import requests
from PIL import Image

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def photos():
    r = requests.post(f"{API}/import-samples", timeout=60)
    assert r.status_code == 200, r.text
    return r.json()


def _spec_with_aspects(photo_ids, aspects, dpi=72, w_cm=20, h_cm=20, bg="#FF00FF"):
    n = len(aspects)
    # grid layout: n cells in a row (simple, keeps cells rectangular but not square)
    cw = 1.0 / n
    cells = []
    for i, asp in enumerate(aspects):
        cells.append({
            "x": i * cw, "y": 0.0, "w": cw, "h": 1.0,
            "photoId": photo_ids[i % len(photo_ids)],
            "zoom": 1.0, "offsetX": 0.0, "offsetY": 0.0,
            "filter": "none", "rotation": 0.0, "aspect": asp,
        })
    return {
        "format": {"w_cm": w_cm, "h_cm": h_cm},
        "dpi": dpi,
        "frame": {"enabled": False, "color": "#121212", "width_cm": 0.0},
        "mat": {"enabled": False, "color": "#FFFFFF", "width_cm": 0.0},
        "gap_cm": 0.0,
        "corner_radius_cm": 0,
        "background_color": bg,
        "cells": cells,
        "texts": [],
    }


@pytest.mark.parametrize("aspect", ["fill", "1:1", "4:3", "3:2", "3:4", "2:3"])
def test_export_accepts_all_aspects(photos, aspect):
    ids = [p["id"] for p in photos]
    spec = _spec_with_aspects(ids, [aspect], dpi=72, w_cm=10, h_cm=10)
    for fmt in ("jpg", "png", "pdf"):
        r = requests.post(f"{API}/export", json={"spec": spec, "fmt": fmt, "filename": f"a_{aspect}"}, timeout=60)
        assert r.status_code == 200, f"{aspect}/{fmt} failed: {r.text[:200]}"


def test_export_mixed_aspects_png_dims(photos):
    """Mixed aspects export returns correct page pixel dims (round(cm/2.54*dpi))."""
    ids = [p["id"] for p in photos]
    spec = _spec_with_aspects(ids, ["fill", "1:1", "4:3", "3:2"], dpi=150, w_cm=20, h_cm=15)
    r = requests.post(f"{API}/export", json={"spec": spec, "fmt": "png", "filename": "mixed"}, timeout=90)
    assert r.status_code == 200, r.text
    img = Image.open(io.BytesIO(r.content))
    exp_w = round(20 / 2.54 * 150)
    exp_h = round(15 / 2.54 * 150)
    assert (img.width, img.height) == (exp_w, exp_h), f"got {img.size} exp ({exp_w},{exp_h})"


def test_square_cell_leaves_bg_margins(photos):
    """A 1:1 cell inside a wide rectangular slot must show background_color margins on the sides."""
    ids = [p["id"] for p in photos]
    # single cell filling full canvas that is 20x10 -> square inner => 10x10; margins on left/right = 5cm each
    bg = "#FF00FF"  # magenta so we can detect margins vs photo
    spec = _spec_with_aspects(ids, ["1:1"], dpi=72, w_cm=20, h_cm=10, bg=bg)
    r = requests.post(f"{API}/export", json={"spec": spec, "fmt": "png", "filename": "sq"}, timeout=60)
    assert r.status_code == 200
    img = Image.open(io.BytesIO(r.content)).convert("RGB")
    W, H = img.size
    # top-left corner should be background (magenta) since inner square is centered
    px_tl = img.getpixel((2, H // 2))
    px_center = img.getpixel((W // 2, H // 2))
    assert px_tl == (255, 0, 255), f"left margin should be bg magenta, got {px_tl}"
    # center should NOT be magenta (photo is there)
    assert px_center != (255, 0, 255), "center should show the photo, not bg"


def test_fill_cell_no_bg_margins(photos):
    """A 'fill' cell should cover the whole cell (no bg-only strips at the sides)."""
    ids = [p["id"] for p in photos]
    bg = "#FF00FF"
    spec = _spec_with_aspects(ids, ["fill"], dpi=72, w_cm=20, h_cm=10, bg=bg)
    r = requests.post(f"{API}/export", json={"spec": spec, "fmt": "png", "filename": "fl"}, timeout=60)
    assert r.status_code == 200
    img = Image.open(io.BytesIO(r.content)).convert("RGB")
    W, H = img.size
    # Sampling several points; none should equal exact magenta bg
    samples = [img.getpixel((2, H // 2)), img.getpixel((W - 3, H // 2)), img.getpixel((W // 2, H // 2))]
    assert all(s != (255, 0, 255) for s in samples), f"unexpected bg pixel in fill mode: {samples}"
