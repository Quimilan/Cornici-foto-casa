// Print formats (base dimensions in cm). Orientation swaps w/h.
export const FORMATS = [
  { id: "30x40", label: "30 × 40 cm", w: 30, h: 40, group: "Classico" },
  { id: "40x50", label: "40 × 50 cm", w: 40, h: 50, group: "Classico" },
  { id: "50x70", label: "50 × 70 cm", w: 50, h: 70, group: "Classico" },
  { id: "60x90", label: "60 × 90 cm", w: 60, h: 90, group: "Classico" },
  { id: "70x100", label: "70 × 100 cm", w: 70, h: 100, group: "Classico" },
  { id: "40x110", label: "40 × 110 cm", w: 40, h: 110, group: "Panoramico" },
  { id: "50x50", label: "50 × 50 cm", w: 50, h: 50, group: "Quadrato / Social", square: true },
  { id: "30x30", label: "30 × 30 cm", w: 30, h: 30, group: "Quadrato / Social", square: true },
  { id: "20x20", label: "20 × 20 cm (Instagram)", w: 20, h: 20, group: "Quadrato / Social", square: true },
];

// Returns oriented { w_cm, h_cm } for a format id + orientation
export function orientedDims(formatId, orientation) {
  const f = FORMATS.find((x) => x.id === formatId) || FORMATS[2];
  const lo = Math.min(f.w, f.h);
  const hi = Math.max(f.w, f.h);
  if (f.square) return { w_cm: f.w, h_cm: f.h };
  if (orientation === "horizontal") return { w_cm: hi, h_cm: lo };
  return { w_cm: lo, h_cm: hi };
}

// grid helper -> array of {x,y,w,h}
function grid(cols, rows) {
  const cells = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      cells.push({ x: c / cols, y: r / rows, w: 1 / cols, h: 1 / rows });
  return cells;
}

// Layout templates keyed by an id. Each has count + cells (fractional rects).
export const LAYOUTS = [
  { key: "1-full", label: "1 · Pieno", count: 1, cells: [{ x: 0, y: 0, w: 1, h: 1 }] },
  { key: "2-cols", label: "2 · Verticale", count: 2, cells: grid(2, 1) },
  { key: "2-rows", label: "2 · Orizzontale", count: 2, cells: grid(1, 2) },
  {
    key: "3-1big-2", label: "3 · 1 + 2", count: 3,
    cells: [{ x: 0, y: 0, w: 0.6, h: 1 }, { x: 0.6, y: 0, w: 0.4, h: 0.5 }, { x: 0.6, y: 0.5, w: 0.4, h: 0.5 }],
  },
  { key: "3-cols", label: "3 · Colonne", count: 3, cells: grid(3, 1) },
  { key: "4-grid", label: "4 · Griglia 2×2", count: 4, cells: grid(2, 2) },
  { key: "4-cols", label: "4 · Colonne", count: 4, cells: grid(4, 1) },
  {
    key: "5-1big-4", label: "5 · 1 + 4", count: 5,
    cells: [
      { x: 0, y: 0, w: 1, h: 0.6 },
      { x: 0, y: 0.6, w: 0.25, h: 0.4 }, { x: 0.25, y: 0.6, w: 0.25, h: 0.4 },
      { x: 0.5, y: 0.6, w: 0.25, h: 0.4 }, { x: 0.75, y: 0.6, w: 0.25, h: 0.4 },
    ],
  },
  { key: "6-grid", label: "6 · Griglia 3×2", count: 6, cells: grid(3, 2) },
  { key: "6-grid-v", label: "6 · Griglia 2×3", count: 6, cells: grid(2, 3) },
  { key: "9-grid", label: "9 · Griglia 3×3", count: 9, cells: grid(3, 3) },
  { key: "12-grid", label: "12 · Griglia 4×3", count: 12, cells: grid(4, 3) },
];

export const FILTERS = [
  { id: "none", label: "Originale" },
  { id: "bw", label: "Bianco e Nero" },
  { id: "sepia", label: "Seppia" },
  { id: "vivid", label: "Vivido" },
  { id: "warm", label: "Caldo" },
  { id: "cool", label: "Freddo" },
];

export const CSS_FILTERS = {
  none: "none",
  bw: "grayscale(1)",
  sepia: "sepia(0.75)",
  vivid: "saturate(1.45) contrast(1.12)",
  warm: "sepia(0.2) saturate(1.2) hue-rotate(-10deg)",
  cool: "saturate(1.1) hue-rotate(15deg) brightness(1.02)",
};

export const FRAME_COLORS = [
  { id: "black", label: "Nero", color: "#121212" },
  { id: "white", label: "Bianco", color: "#FAFAFA" },
  { id: "wood", label: "Legno", color: "#C29B6C" },
  { id: "metal", label: "Alluminio", color: "#8E9196" },
];

export const MAT_COLORS = [
  { id: "white", label: "Bianco", color: "#FFFFFF" },
  { id: "cream", label: "Crema", color: "#F8F5EE" },
  { id: "black", label: "Nero", color: "#18181A" },
];

export function newCells(layoutKey) {
  const layout = LAYOUTS.find((l) => l.key === layoutKey) || LAYOUTS[5];
  return layout.cells.map((c) => ({
    ...c,
    photoId: null,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    filter: "none",
  }));
}
