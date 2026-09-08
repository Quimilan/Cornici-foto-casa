import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const photoUrl = (id) => `${API}/file/${id}`;

export const api = axios.create({ baseURL: API });

export async function fetchPhotos() {
  const { data } = await api.get("/photos");
  return data;
}

export async function importSamples() {
  const { data } = await api.post("/import-samples");
  return data;
}

export async function uploadPhoto(file, onProgress) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
  return data;
}

export async function deletePhoto(id) {
  await api.delete(`/photos/${id}`);
}

export async function saveProject(payload) {
  const { data } = await api.post("/projects", payload);
  return data;
}

export async function listProjects() {
  const { data } = await api.get("/projects");
  return data;
}

export async function deleteProject(id) {
  await api.delete(`/projects/${id}`);
}

export async function exportCollage(spec, fmt, filename, opts = {}) {
  const res = await api.post(
    "/export",
    { spec, fmt, filename, ...opts },
    { responseType: "blob" }
  );
  return res.data;
}
