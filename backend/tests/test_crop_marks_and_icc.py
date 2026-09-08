"""Iteration 4: crop marks (crocini di taglio) + FOGRA39 ICC profile."""
import io
import os
import re
import pytest
import requests
from PIL import Image

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    return requests.Session()


@pytest.fixture(scope="module")
def photo_ids(session):
    session.post(f"{API}/import-samples", timeout=120)
    photos = session.get(f"{API}/photos").json()
    return [p["id"] for p in photos][:4]


def _spec(w_cm, h_cm, dpi, ids):
    return {
        "format": {"w_cm": w_cm, "h_cm": h_cm},
        "dpi": dpi,
        "frame": {"enabled": True, "color": "#121212", "width_cm": 2.0},
        "mat": {"enabled": True, "color": "#FFFFFF", "width_cm": 3.0},
        "gap_cm": 0.4,
        "background_color": "#FFFFFF",
        "cells": [
            {"x": i % 2 * 0.5, "y": i // 2 * 0.5, "w": 0.5, "h": 0.5,
             "photoId": ids[i] if i < len(ids) else None}
            for i in range(4)
        ],
    }


def _pdf_dims(content: bytes):
    text = content[:400000].decode("latin-1", errors="ignore")
    widths = [int(m) for m in re.findall(r"/Width\s+(\d+)", text)]
    heights = [int(m) for m in re.findall(r"/Height\s+(\d+)", text)]
    return widths, heights, text


# --- Crop marks dimensions ---
def test_crop_marks_a4_bleed3mm_dims(session, photo_ids):
    dpi = 300
    spec = _spec(30, 40, dpi, photo_ids)
    body = {"spec": spec, "fmt": "pdf",
            "paper": {"w_cm": 21.0, "h_cm": 29.7},
            "bleed_mm": 3, "cmyk": True, "icc": True, "crop_marks": True}
    r = session.post(f"{API}/export", json=body, timeout=300)
    assert r.status_code == 200, r.text
    assert r.content[:4] == b"%PDF"
    widths, heights, text = _pdf_dims(r.content)
    bleed_px = round(3 / 25.4 * dpi)                       # 35
    mark_len = max(8, round(4 / 25.4 * dpi))               # 47
    thick = max(2, round(dpi / 300 * 2))                   # 2
    margin = mark_len + thick + round(1 / 25.4 * dpi)      # 47+2+12 = 61
    exp_w = round(21.0 / 2.54 * dpi) + 2 * bleed_px + 2 * margin  # 2480+70+122=2672
    exp_h = round(29.7 / 2.54 * dpi) + 2 * bleed_px + 2 * margin  # 3508+70+122=3700
    assert exp_w == 2672 and exp_h == 3700
    assert exp_w in widths, f"expected {exp_w} in {widths}"
    assert exp_h in heights, f"expected {exp_h} in {heights}"
    assert "/DeviceCMYK" in text


# --- FOGRA39 ICC embedded ---
def test_pdf_cmyk_icc_fogra39(session, photo_ids):
    spec = _spec(30, 40, 300, photo_ids)
    body = {"spec": spec, "fmt": "pdf",
            "paper": {"w_cm": 21.0, "h_cm": 29.7},
            "bleed_mm": 3, "cmyk": True, "icc": True, "crop_marks": False}
    r = session.post(f"{API}/export", json=body, timeout=300)
    assert r.status_code == 200
    text = r.content.decode("latin-1", errors="ignore")
    assert "/DeviceCMYK" in text
    assert "/DeviceRGB" not in text
    # ICC profile embedded either as PDF ICCBased colorspace or inside JPEG APP2 marker
    assert (b"ICC_PROFILE\x00" in r.content or b"ICCBased" in r.content), \
        "Expected embedded ICC profile in PDF/JPEG stream"
    # Compare against baseline (no ICC) - CMYK bytes should differ significantly
    body2 = dict(body); body2["icc"] = False
    r2 = session.post(f"{API}/export", json=body2, timeout=300)
    assert r2.status_code == 200
    assert len(r.content) != len(r2.content), "PDF with ICC should differ from PDF without ICC"


# --- CMYK without ICC (Pillow default) still yields CMYK ---
def test_pdf_cmyk_without_icc(session, photo_ids):
    spec = _spec(30, 40, 200, photo_ids)
    body = {"spec": spec, "fmt": "pdf",
            "paper": {"w_cm": 21.0, "h_cm": 29.7},
            "bleed_mm": 3, "cmyk": True, "icc": False, "crop_marks": False}
    r = session.post(f"{API}/export", json=body, timeout=300)
    assert r.status_code == 200
    text = r.content.decode("latin-1", errors="ignore")
    assert "/DeviceCMYK" in text
    assert "/DeviceRGB" not in text


# --- RGB PDF ---
def test_pdf_rgb(session, photo_ids):
    spec = _spec(30, 40, 150, photo_ids)
    body = {"spec": spec, "fmt": "pdf",
            "paper": {"w_cm": 21.0, "h_cm": 29.7},
            "bleed_mm": 0, "cmyk": False, "icc": True, "crop_marks": False}
    r = session.post(f"{API}/export", json=body, timeout=180)
    assert r.status_code == 200
    text = r.content.decode("latin-1", errors="ignore")
    assert "/DeviceRGB" in text
    assert "/DeviceCMYK" not in text


# --- Crop marks with paper=null (auto) + bleed=3 ---
def test_crop_marks_auto_paper(session, photo_ids):
    dpi = 300
    spec = _spec(20, 20, dpi, photo_ids)
    body = {"spec": spec, "fmt": "pdf",
            "bleed_mm": 3, "cmyk": False, "crop_marks": True}
    r = session.post(f"{API}/export", json=body, timeout=300)
    assert r.status_code == 200
    widths, heights, _ = _pdf_dims(r.content)
    bleed_px = round(3 / 25.4 * dpi)
    margin = max(8, round(4 / 25.4 * dpi)) + max(2, round(dpi / 300 * 2)) + round(1 / 25.4 * dpi)
    exp = round(20 / 2.54 * dpi) + 2 * bleed_px + 2 * margin
    assert exp in widths and exp in heights, f"expected {exp} in {widths}/{heights}"


# --- Regression: crop marks apply to png/jpg (bigger image) ---
def test_crop_marks_png(session, photo_ids):
    dpi = 150
    spec = _spec(20, 20, dpi, photo_ids)
    # baseline size
    r0 = session.post(f"{API}/export", json={"spec": spec, "fmt": "png"}, timeout=180)
    assert r0.status_code == 200
    base = Image.open(io.BytesIO(r0.content)).size

    r = session.post(f"{API}/export",
                     json={"spec": spec, "fmt": "png", "bleed_mm": 3, "crop_marks": True},
                     timeout=180)
    assert r.status_code == 200
    img = Image.open(io.BytesIO(r.content))
    assert img.size[0] > base[0] and img.size[1] > base[1]
    bleed_px = round(3 / 25.4 * dpi)
    margin = max(8, round(4 / 25.4 * dpi)) + max(2, round(dpi / 300 * 2)) + round(1 / 25.4 * dpi)
    assert img.size[0] == base[0] + 2 * bleed_px + 2 * margin


def test_crop_marks_jpg(session, photo_ids):
    dpi = 150
    spec = _spec(20, 20, dpi, photo_ids)
    r = session.post(f"{API}/export",
                     json={"spec": spec, "fmt": "jpg", "bleed_mm": 3, "crop_marks": True},
                     timeout=180)
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/jpeg"
    img = Image.open(io.BytesIO(r.content))
    bleed_px = round(3 / 25.4 * dpi)
    margin = max(8, round(4 / 25.4 * dpi)) + max(2, round(dpi / 300 * 2)) + round(1 / 25.4 * dpi)
    base_w = round(20 / 2.54 * dpi)
    assert img.size == (base_w + 2 * bleed_px + 2 * margin,) * 2
