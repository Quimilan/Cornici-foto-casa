"""Tests for the new professional PDF export: CMYK + bleed + paper format."""
import os
import io
import re
import pytest
import requests
from PIL import Image

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or
            "https://collage-maker-pro.preview.emergentagent.com").rstrip("/")
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
            {"x": 0, "y": 0, "w": 0.5, "h": 0.5, "photoId": ids[0] if len(ids) > 0 else None},
            {"x": 0.5, "y": 0, "w": 0.5, "h": 0.5, "photoId": ids[1] if len(ids) > 1 else None},
            {"x": 0, "y": 0.5, "w": 0.5, "h": 0.5, "photoId": ids[2] if len(ids) > 2 else None},
            {"x": 0.5, "y": 0.5, "w": 0.5, "h": 0.5, "photoId": ids[3] if len(ids) > 3 else None},
        ],
    }


def _pdf_widths_heights(content: bytes):
    text = content[:200000].decode("latin-1", errors="ignore")
    widths = [int(m) for m in re.findall(r"/Width\s+(\d+)", text)]
    heights = [int(m) for m in re.findall(r"/Height\s+(\d+)", text)]
    return widths, heights


def test_pdf_a4_cmyk_bleed3mm(session, photo_ids):
    spec = _spec(30, 40, 300, photo_ids)  # collage 30x40 placed on A4
    body = {"spec": spec, "fmt": "pdf",
            "paper": {"w_cm": 21.0, "h_cm": 29.7},
            "bleed_mm": 3, "cmyk": True}
    r = session.post(f"{API}/export", json=body, timeout=300)
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "application/pdf"
    assert r.content[:4] == b"%PDF"
    text = r.content[:200000].decode("latin-1", errors="ignore")
    assert "/DeviceCMYK" in text, "PDF must embed CMYK colorspace"
    assert "/DeviceRGB" not in text or text.index("/DeviceCMYK") < text.index("/DeviceRGB")
    widths, heights = _pdf_widths_heights(r.content)
    # backend rounds each dim independently
    bleed_px = round(3 / 25.4 * 300)
    exp_w = round(21.0 / 2.54 * 300) + 2 * bleed_px
    exp_h = round(29.7 / 2.54 * 300) + 2 * bleed_px
    assert exp_w in widths, f"expected width {exp_w} not in {widths}"
    assert exp_h in heights, f"expected height {exp_h} not in {heights}"


def test_pdf_auto_paper_bleed_cmyk(session, photo_ids):
    # paper omitted -> uses collage's own format (50x70) as page size
    spec = _spec(50, 70, 300, photo_ids)
    body = {"spec": spec, "fmt": "pdf", "bleed_mm": 3, "cmyk": True}
    r = session.post(f"{API}/export", json=body, timeout=300)
    assert r.status_code == 200
    assert r.content[:4] == b"%PDF"
    text = r.content[:200000].decode("latin-1", errors="ignore")
    assert "/DeviceCMYK" in text
    widths, heights = _pdf_widths_heights(r.content)
    bleed_px = round(3 / 25.4 * 300)
    exp_w = round(50 / 2.54 * 300) + 2 * bleed_px
    exp_h = round(70 / 2.54 * 300) + 2 * bleed_px
    assert exp_w in widths, f"expected {exp_w}, got {widths}"
    assert exp_h in heights, f"expected {exp_h}, got {heights}"


def test_pdf_rgb_no_bleed(session, photo_ids):
    spec = _spec(30, 40, 150, photo_ids)
    body = {"spec": spec, "fmt": "pdf",
            "paper": {"w_cm": 21.0, "h_cm": 29.7},
            "bleed_mm": 0, "cmyk": False}
    r = session.post(f"{API}/export", json=body, timeout=180)
    assert r.status_code == 200
    text = r.content[:200000].decode("latin-1", errors="ignore")
    assert "/DeviceRGB" in text
    assert "/DeviceCMYK" not in text
    widths, heights = _pdf_widths_heights(r.content)
    exp_w = round(21.0 / 2.54 * 150)
    exp_h = round(29.7 / 2.54 * 150)
    assert exp_w in widths, f"expected {exp_w}, got {widths}"
    assert exp_h in heights, f"expected {exp_h}, got {heights}"


def test_regression_jpg_ignores_paper(session, photo_ids):
    spec = _spec(50, 70, 150, photo_ids)
    r = session.post(f"{API}/export", json={"spec": spec, "fmt": "jpg"}, timeout=180)
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/jpeg"
    img = Image.open(io.BytesIO(r.content))
    assert img.size == (round(50 / 2.54 * 150), round(70 / 2.54 * 150))
    assert img.mode == "RGB"


def test_regression_png_default(session, photo_ids):
    spec = _spec(30, 40, 150, photo_ids)
    r = session.post(f"{API}/export", json={"spec": spec, "fmt": "png"}, timeout=180)
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/png"
    img = Image.open(io.BytesIO(r.content))
    assert img.size == (round(30 / 2.54 * 150), round(40 / 2.54 * 150))
