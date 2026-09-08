"""Iteration 6: shape-packing export regression - all cells 1:1 renders correctly.

We don't need to re-test render_cell aspect (covered by test_cell_aspect.py); this ensures
that a spec produced by the frontend shape-pack (e.g., 3x3 grid of 1:1 cells) exports
successfully and produces correct page dimensions.
"""
import os
import io
import math
import pytest
import requests
from PIL import Image

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")


def _ensure_photos(session):
    r = session.get(f"{BASE_URL}/api/photos")
    r.raise_for_status()
    photos = r.json()
    if not photos:
        r = session.post(f"{BASE_URL}/api/import-samples")
        r.raise_for_status()
        photos = r.json()
    return photos


def _grid_cells(cols, rows, aspect="1:1", photo_id=None):
    cells = []
    for r in range(rows):
        for c in range(cols):
            cells.append({
                "x": c / cols, "y": r / rows, "w": 1 / cols, "h": 1 / rows,
                "photoId": photo_id, "zoom": 1.0, "offsetX": 0.0, "offsetY": 0.0,
                "filter": "none", "rotation": 0.0, "aspect": aspect,
            })
    return cells


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def photo_id(api):
    photos = _ensure_photos(api)
    return photos[0]["id"]


@pytest.mark.parametrize("fmt,cols,rows", [
    ("jpg", 3, 3),   # square-ish frame packed with 9 squares
    ("png", 2, 3),   # rectangular
    ("pdf", 4, 3),   # more cells
])
def test_shape_grid_export(api, photo_id, fmt, cols, rows):
    """Export a spec resembling the FE 'apply shape to all cells' output."""
    spec = {
        "format": {"w_cm": 30, "h_cm": 30},
        "dpi": 150,
        "frame": {"enabled": True, "color": "#121212", "width_cm": 1.0},
        "mat": {"enabled": True, "color": "#FFFFFF", "width_cm": 1.5},
        "gap_cm": 0.2,
        "corner_radius_cm": 0.0,
        "background_color": "#FFFFFF",
        "cells": _grid_cells(cols, rows, aspect="1:1", photo_id=photo_id),
        "texts": [],
    }
    r = api.post(f"{BASE_URL}/api/export", json={"spec": spec, "fmt": fmt, "filename": "test_shape"})
    assert r.status_code == 200, r.text[:200]
    ctype = r.headers.get("content-type", "")
    if fmt == "pdf":
        assert "pdf" in ctype
        assert r.content[:4] == b"%PDF"
    else:
        assert fmt in ctype or "image" in ctype
        img = Image.open(io.BytesIO(r.content))
        exp_w = round(30 / 2.54 * 150)
        exp_h = round(30 / 2.54 * 150)
        # Allow +/- 1 pixel rounding
        assert abs(img.size[0] - exp_w) <= 2
        assert abs(img.size[1] - exp_h) <= 2


def test_malformed_aspect_does_not_500(api, photo_id):
    """Safe guard: malformed aspect like '1:0' should not crash export."""
    spec = {
        "format": {"w_cm": 20, "h_cm": 20},
        "dpi": 100,
        "frame": {"enabled": False, "color": "#000", "width_cm": 0},
        "mat": {"enabled": False, "color": "#FFF", "width_cm": 0},
        "gap_cm": 0.0,
        "corner_radius_cm": 0.0,
        "background_color": "#FFFFFF",
        "cells": [{
            "x": 0, "y": 0, "w": 1, "h": 1,
            "photoId": photo_id, "zoom": 1, "offsetX": 0, "offsetY": 0,
            "filter": "none", "rotation": 0, "aspect": "1:0",
        }],
        "texts": [],
    }
    r = api.post(f"{BASE_URL}/api/export", json={"spec": spec, "fmt": "jpg", "filename": "test_bad"})
    assert r.status_code == 200, f"Malformed aspect returned {r.status_code}: {r.text[:200]}"
