"""Iteration 5: Regression tests for gallery layout export (many cells + empty cells)."""
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


def grid_cells(cols, n):
    rows = -(-n // cols)
    row_h = 1.0 / rows
    out = []
    for r in range(rows):
        in_row = min(cols, n - r * cols)
        cw = 1.0 / in_row
        for c in range(in_row):
            out.append({"x": c * cw, "y": r * row_h, "w": cw, "h": row_h})
    return out


def _spec(n, photo_ids, dpi=72, w_cm=30, h_cm=40):
    cells = grid_cells(5 if n >= 25 else max(1, round(n ** 0.5)), n)
    # assign photoIds to some cells, leave others empty
    for i, c in enumerate(cells):
        c.update({
            "photoId": photo_ids[i % len(photo_ids)] if i < len(photo_ids) // 2 else None,
            "zoom": 1, "offsetX": 0, "offsetY": 0, "filter": "none", "rotation": 0,
        })
    return {
        "format": {"w_cm": w_cm, "h_cm": h_cm},
        "dpi": dpi,
        "frame": {"enabled": True, "color": "#121212", "width_cm": 1.0},
        "mat": {"enabled": False, "color": "#FFFFFF", "width_cm": 0.0},
        "gap_cm": 0.4,
        "corner_radius_cm": 0,
        "background_color": "#FFFFFF",
        "cells": cells,
        "texts": [],
    }


def test_export_24_cells_png(photos):
    """24 cells in grid, half with photos half empty -> valid PNG with expected dims."""
    ids = [p["id"] for p in photos]
    spec = _spec(24, ids, dpi=72, w_cm=30, h_cm=40)
    r = requests.post(f"{API}/export", json={"spec": spec, "fmt": "png", "filename": "t24"}, timeout=60)
    assert r.status_code == 200, r.text
    img = Image.open(io.BytesIO(r.content))
    # expected px = cm/2.54*dpi
    exp_w = round(30 / 2.54 * 72)
    exp_h = round(40 / 2.54 * 72)
    assert abs(img.width - exp_w) <= 2 and abs(img.height - exp_h) <= 2
    assert img.mode in ("RGB", "RGBA")


def test_export_1_cell_full(photos):
    ids = [p["id"] for p in photos]
    spec = _spec(1, ids, dpi=72, w_cm=30, h_cm=40)
    r = requests.post(f"{API}/export", json={"spec": spec, "fmt": "jpg", "filename": "t1"}, timeout=60)
    assert r.status_code == 200
    img = Image.open(io.BytesIO(r.content))
    assert img.width > 100 and img.height > 100


def test_export_50_cells_png(photos):
    ids = [p["id"] for p in photos]
    spec = _spec(50, ids, dpi=72, w_cm=30, h_cm=40)
    r = requests.post(f"{API}/export", json={"spec": spec, "fmt": "png", "filename": "t50"}, timeout=90)
    assert r.status_code == 200
    img = Image.open(io.BytesIO(r.content))
    assert img.width > 0 and img.height > 0


def test_export_pdf_professional_with_many_cells(photos):
    """PDF CMYK + ICC + bleed + crop_marks still works with the new cell model."""
    ids = [p["id"] for p in photos]
    spec = _spec(12, ids, dpi=300, w_cm=30, h_cm=40)
    payload = {
        "spec": spec, "fmt": "pdf", "filename": "prof",
        "paper": {"w_cm": 21.0, "h_cm": 29.7}, "bleed_mm": 3, "cmyk": True, "icc": True, "crop_marks": True,
    }
    r = requests.post(f"{API}/export", json=payload, timeout=120)
    assert r.status_code == 200, r.text
    assert r.content[:4] == b"%PDF"
    # /DeviceCMYK or /ICCBased colorspace present
    assert b"CMYK" in r.content or b"ICCBased" in r.content


def test_project_save_load_preserves_cells(photos):
    ids = [p["id"] for p in photos]
    spec = _spec(7, ids, dpi=72)
    payload = {
        "name": "TEST_gallery_7",
        "formatId": "30x40",
        "orientation": "vertical",
        "layoutKey": "g-7-3",
        "spec": spec,
    }
    r = requests.post(f"{API}/projects", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]

    g = requests.get(f"{API}/projects/{pid}", timeout=30)
    assert g.status_code == 200
    data = g.json()
    assert len(data["spec"]["cells"]) == 7
    # cleanup
    requests.delete(f"{API}/projects/{pid}", timeout=30)
