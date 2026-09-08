"""Iteration 2 - Backend tests for new features: cell rotation, texts on passe-partout."""
import os
import io
import pytest
import requests
from PIL import Image

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    return requests.Session()


@pytest.fixture(scope="module")
def sample_photo_ids(session):
    session.post(f"{API}/import-samples", timeout=120)
    photos = session.get(f"{API}/photos").json()
    return [p["id"] for p in photos][:4]


def _base_spec(w_cm=30, h_cm=40, dpi=150):
    return {
        "format": {"w_cm": w_cm, "h_cm": h_cm},
        "dpi": dpi,
        "frame": {"enabled": True, "color": "#121212", "width_cm": 2.0},
        "mat": {"enabled": True, "color": "#FFFFFF", "width_cm": 3.0},
        "gap_cm": 0.4,
        "background_color": "#FFFFFF",
        "cells": [
            {"x": 0, "y": 0, "w": 0.5, "h": 0.5, "rotation": 0, "zoom": 1},
            {"x": 0.5, "y": 0, "w": 0.5, "h": 0.5, "rotation": 0, "zoom": 1},
            {"x": 0, "y": 0.5, "w": 0.5, "h": 0.5, "rotation": 0, "zoom": 1},
            {"x": 0.5, "y": 0.5, "w": 0.5, "h": 0.5, "rotation": 0, "zoom": 1},
        ],
        "texts": [],
    }


# --- Cell rotation ---
def test_export_with_cell_rotation(session, sample_photo_ids):
    spec = _base_spec(30, 40, 150)
    for i, pid in enumerate(sample_photo_ids):
        spec["cells"][i]["photoId"] = pid
    # Rotate first cell 15 deg with high zoom to fill
    spec["cells"][0]["rotation"] = 15
    spec["cells"][0]["zoom"] = 1.5
    r = session.post(f"{API}/export", json={"spec": spec, "fmt": "jpg"}, timeout=180)
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "image/jpeg"
    img = Image.open(io.BytesIO(r.content))
    exp_w = round(30 / 2.54 * 150)
    exp_h = round(40 / 2.54 * 150)
    assert img.size == (exp_w, exp_h)
    assert len(r.content) > 5000


# --- Texts on passe-partout ---
def test_export_with_texts_multiple_fonts(session, sample_photo_ids):
    spec = _base_spec(30, 40, 150)
    for i, pid in enumerate(sample_photo_ids):
        spec["cells"][i]["photoId"] = pid
    spec["texts"] = [
        {"id": "t1", "content": "Il nostro viaggio", "x": 0.5, "y": 0.05,
         "size_cm": 1.5, "color": "#18181A", "font": "playfair",
         "align": "center", "rotation": 0, "letter_spacing": 0.06},
        {"id": "t2", "content": "Ricordi 2025", "x": 0.5, "y": 0.95,
         "size_cm": 1.0, "color": "#8a6d3b", "font": "dancing",
         "align": "center", "rotation": 0, "letter_spacing": 0.0},
        {"id": "t3", "content": "MONTAGNA", "x": 0.2, "y": 0.5,
         "size_cm": 0.8, "color": "#B91C1C", "font": "montserrat",
         "align": "center", "rotation": 15, "letter_spacing": 0.1},
    ]
    r = session.post(f"{API}/export", json={"spec": spec, "fmt": "jpg"}, timeout=180)
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "image/jpeg"
    img = Image.open(io.BytesIO(r.content))
    exp_w = round(30 / 2.54 * 150)
    exp_h = round(40 / 2.54 * 150)
    assert img.size == (exp_w, exp_h)
    # Non-trivial size (text rendered adds bytes)
    assert len(r.content) > 10000


# --- Full spec with all 3 formats ---
@pytest.mark.parametrize("fmt,mime", [("jpg", "image/jpeg"), ("pdf", "application/pdf"), ("png", "image/png")])
def test_export_full_new_collagespec_all_formats(session, sample_photo_ids, fmt, mime):
    spec = _base_spec(30, 40, 150)
    for i, pid in enumerate(sample_photo_ids):
        spec["cells"][i]["photoId"] = pid
    spec["cells"][0]["rotation"] = 10
    spec["cells"][1]["rotation"] = -20
    spec["texts"] = [
        {"id": "t1", "content": "Titolo", "x": 0.5, "y": 0.95,
         "size_cm": 1.2, "color": "#18181A", "font": "playfair",
         "align": "center", "rotation": 0, "letter_spacing": 0.04},
    ]
    r = session.post(f"{API}/export", json={"spec": spec, "fmt": fmt}, timeout=180)
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == mime


def test_export_empty_text_content_no_error(session, sample_photo_ids):
    spec = _base_spec(30, 40, 150)
    for i, pid in enumerate(sample_photo_ids):
        spec["cells"][i]["photoId"] = pid
    spec["texts"] = [{"id": "t1", "content": "   ", "x": 0.5, "y": 0.5, "size_cm": 1, "color": "#000", "font": "playfair", "align": "center", "rotation": 0, "letter_spacing": 0}]
    r = session.post(f"{API}/export", json={"spec": spec, "fmt": "jpg"}, timeout=120)
    assert r.status_code == 200
