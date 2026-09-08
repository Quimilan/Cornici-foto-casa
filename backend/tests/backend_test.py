"""Backend tests for Collage Studio - photos, projects, export."""
import os
import io
import time
import pytest
import requests
from PIL import Image

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or \
           "https://collage-maker-pro.preview.emergentagent.com"
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    return s


# --- Health ---
def test_root(session):
    r = session.get(f"{API}/")
    assert r.status_code == 200
    assert "Collage" in r.json().get("message", "")


# --- Samples import (idempotent) ---
def test_import_samples_first_call(session):
    r = session.post(f"{API}/import-samples", timeout=120)
    assert r.status_code == 200
    photos = r.json()
    assert isinstance(photos, list)
    assert len(photos) >= 1
    for p in photos:
        assert p.get("width", 0) > 0 and p.get("height", 0) > 0
        assert "id" in p and "storage_path" in p


def test_import_samples_idempotent(session):
    r1 = session.post(f"{API}/import-samples", timeout=60)
    r2 = session.post(f"{API}/import-samples", timeout=60)
    assert r1.status_code == 200 and r2.status_code == 200
    ids1 = sorted([p["id"] for p in r1.json()])
    ids2 = sorted([p["id"] for p in r2.json()])
    assert ids1 == ids2, "Repeated import created duplicates"


def test_list_photos(session):
    r = session.get(f"{API}/photos")
    assert r.status_code == 200
    photos = r.json()
    assert len(photos) >= 1
    # No mongo _id leaked
    assert all("_id" not in p for p in photos)


# --- Upload / serve / delete ---
def _make_test_png_bytes(w=200, h=150, color=(200, 50, 50)):
    img = Image.new("RGB", (w, h), color)
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return buf.getvalue()


def test_upload_and_serve(session):
    data = _make_test_png_bytes(320, 240)
    files = {"file": ("TEST_upload.png", data, "image/png")}
    r = session.post(f"{API}/upload", files=files, timeout=60)
    assert r.status_code == 200, r.text
    ph = r.json()
    assert ph["width"] == 320 and ph["height"] == 240
    assert ph["id"]
    # serve
    r2 = session.get(f"{API}/file/{ph['id']}", timeout=30)
    assert r2.status_code == 200
    assert r2.headers["content-type"].startswith("image/")
    assert len(r2.content) > 100
    # cleanup
    session.delete(f"{API}/photos/{ph['id']}")


def test_upload_invalid_file(session):
    files = {"file": ("bad.txt", b"not-an-image", "text/plain")}
    r = session.post(f"{API}/upload", files=files, timeout=30)
    assert r.status_code == 400


def test_delete_soft(session):
    # upload one
    data = _make_test_png_bytes(100, 100)
    r = session.post(f"{API}/upload", files={"file": ("TEST_del.png", data, "image/png")}, timeout=30)
    pid = r.json()["id"]
    # delete
    d = session.delete(f"{API}/photos/{pid}")
    assert d.status_code == 200
    # not in list
    ids = [p["id"] for p in session.get(f"{API}/photos").json()]
    assert pid not in ids
    # file 404
    f = session.get(f"{API}/file/{pid}")
    assert f.status_code == 404


# --- Projects CRUD ---
def _make_spec():
    return {
        "format": {"w_cm": 50, "h_cm": 70},
        "dpi": 150,
        "frame": {"enabled": True, "color": "#121212", "width_cm": 2.0},
        "mat": {"enabled": True, "color": "#FFFFFF", "width_cm": 3.0},
        "gap_cm": 0.4,
        "background_color": "#FFFFFF",
        "cells": [
            {"x": 0, "y": 0, "w": 0.5, "h": 0.5},
            {"x": 0.5, "y": 0, "w": 0.5, "h": 0.5},
            {"x": 0, "y": 0.5, "w": 0.5, "h": 0.5},
            {"x": 0.5, "y": 0.5, "w": 0.5, "h": 0.5},
        ],
    }


def test_project_crud(session):
    payload = {
        "name": "TEST_project",
        "formatId": "50x70",
        "orientation": "vertical",
        "layoutKey": "grid2x2",
        "spec": _make_spec(),
    }
    r = session.post(f"{API}/projects", json=payload)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    # list
    lst = session.get(f"{API}/projects").json()
    assert any(p["id"] == pid for p in lst)
    # get
    g = session.get(f"{API}/projects/{pid}")
    assert g.status_code == 200
    assert g.json()["name"] == "TEST_project"
    # delete
    d = session.delete(f"{API}/projects/{pid}")
    assert d.status_code == 200
    g2 = session.get(f"{API}/projects/{pid}")
    assert g2.status_code == 404


# --- Export ---
@pytest.fixture(scope="module")
def sample_photo_ids(session):
    session.post(f"{API}/import-samples", timeout=120)
    photos = session.get(f"{API}/photos").json()
    return [p["id"] for p in photos][:4]


def _spec_with_photos(w_cm, h_cm, dpi, photo_ids):
    spec = _make_spec()
    spec["format"] = {"w_cm": w_cm, "h_cm": h_cm}
    spec["dpi"] = dpi
    for i, cell in enumerate(spec["cells"]):
        if i < len(photo_ids):
            cell["photoId"] = photo_ids[i]
    return spec


def test_export_jpg_150dpi_dimensions(session, sample_photo_ids):
    spec = _spec_with_photos(50, 70, 150, sample_photo_ids)
    r = session.post(f"{API}/export", json={"spec": spec, "fmt": "jpg"}, timeout=180)
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "image/jpeg"
    img = Image.open(io.BytesIO(r.content))
    exp_w = round(50 / 2.54 * 150)
    exp_h = round(70 / 2.54 * 150)
    assert img.size == (exp_w, exp_h), f"got {img.size} expected {(exp_w, exp_h)}"


def test_export_jpg_300dpi_dimensions(session, sample_photo_ids):
    spec = _spec_with_photos(50, 70, 300, sample_photo_ids)
    r = session.post(f"{API}/export", json={"spec": spec, "fmt": "jpg"}, timeout=300)
    assert r.status_code == 200
    img = Image.open(io.BytesIO(r.content))
    exp_w = round(50 / 2.54 * 300)
    exp_h = round(70 / 2.54 * 300)
    assert img.size == (exp_w, exp_h)


def test_export_pdf(session, sample_photo_ids):
    spec = _spec_with_photos(30, 40, 150, sample_photo_ids)
    r = session.post(f"{API}/export", json={"spec": spec, "fmt": "pdf"}, timeout=180)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert r.content[:4] == b"%PDF"


def test_export_png(session, sample_photo_ids):
    spec = _spec_with_photos(30, 40, 150, sample_photo_ids)
    r = session.post(f"{API}/export", json={"spec": spec, "fmt": "png"}, timeout=180)
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/png"
    img = Image.open(io.BytesIO(r.content))
    assert img.format == "PNG"
