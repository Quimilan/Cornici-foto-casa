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

export const PAPER_FORMATS = [
  { id: "auto", label: "Come il collage" },
  { id: "A5", label: "A5 (14,8 × 21 cm)", w: 14.8, h: 21.0 },
  { id: "A4", label: "A4 (21 × 29,7 cm)", w: 21.0, h: 29.7 },
  { id: "A3", label: "A3 (29,7 × 42 cm)", w: 29.7, h: 42.0 },
  { id: "A2", label: "A2 (42 × 59,4 cm)", w: 42.0, h: 59.4 },
  { id: "30x40", label: "30 × 40 cm", w: 30, h: 40 },
  { id: "50x70", label: "50 × 70 cm", w: 50, h: 70 },
  { id: "70x100", label: "70 × 100 cm", w: 70, h: 100 },
];

export function paperDims(paperId, orientation) {
  const p = PAPER_FORMATS.find((x) => x.id === paperId);
  if (!p || !p.w) return null;
  const lo = Math.min(p.w, p.h);
  const hi = Math.max(p.w, p.h);
  return orientation === "horizontal" ? { w_cm: hi, h_cm: lo } : { w_cm: lo, h_cm: hi };
}

// ---- Gallery layout engine (1..50 frames) ----
export function decorateCells(rects) {
  return rects.map((c) => ({
    x: c.x, y: c.y, w: c.w, h: c.h,
    photoId: null, zoom: 1, offsetX: 0, offsetY: 0, filter: "none", rotation: 0, aspect: "fill",
  }));
}

// Regular grid of n cells with `cols` columns; last row fills its width evenly.
export function gridCells(cols, n) {
  cols = Math.max(1, cols);
  const rows = Math.ceil(n / cols);
  const rowH = 1 / rows;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    const inRow = Math.min(cols, n - r * cols);
    const cw = 1 / inRow;
    for (let c = 0; c < inRow; c++) {
      cells.push({ x: c * cw, y: r * rowH, w: cw, h: rowH });
    }
  }
  return cells;
}

function placeInRect(rects, X, Y, W, H) {
  return rects.map((c) => ({ x: X + c.x * W, y: Y + c.y * H, w: c.w * W, h: c.h * H }));
}

function bestCols(n) {
  return Math.max(1, Math.round(Math.sqrt(n)));
}

function heroTop(n) {
  const hero = { x: 0, y: 0, w: 1, h: 0.45 };
  const rest = placeInRect(gridCells(bestCols(n - 1), n - 1), 0, 0.45, 1, 0.55);
  return [hero, ...rest];
}

function heroLeft(n) {
  const hero = { x: 0, y: 0, w: 0.58, h: 1 };
  const cols = n - 1 <= 3 ? 1 : n - 1 <= 8 ? 2 : 3;
  const rest = placeInRect(gridCells(cols, n - 1), 0.58, 0, 0.42, 1);
  return [hero, ...rest];
}

const CURATED_MIXED = {
  3: [{ key: "m3-1-2", label: "1 grande + 2", cells: [{ x: 0, y: 0, w: 0.6, h: 1 }, { x: 0.6, y: 0, w: 0.4, h: 0.5 }, { x: 0.6, y: 0.5, w: 0.4, h: 0.5 }] }],
  5: [{ key: "m5-1-4", label: "1 grande + 4", cells: [{ x: 0, y: 0, w: 1, h: 0.6 }, { x: 0, y: 0.6, w: 0.25, h: 0.4 }, { x: 0.25, y: 0.6, w: 0.25, h: 0.4 }, { x: 0.5, y: 0.6, w: 0.25, h: 0.4 }, { x: 0.75, y: 0.6, w: 0.25, h: 0.4 }] }],
  7: [{ key: "m7-1-6", label: "1 grande + 6", cells: [{ x: 0, y: 0, w: 1, h: 0.5 }, ...placeInRect(gridCells(3, 6), 0, 0.5, 1, 0.5)] }],
};

// Grid arrangements for a given count
export function gridVariants(n) {
  n = Math.max(1, Math.min(50, n));
  if (n === 1) return [{ key: "g-1", label: "1 riquadro", cells: [{ x: 0, y: 0, w: 1, h: 1 }] }];
  const opts = new Set();
  const b = bestCols(n);
  opts.add(b); opts.add(Math.max(1, b - 1)); opts.add(b + 1);
  let best = null, bestDiff = 1e9;
  for (let c = 1; c <= n; c++) {
    if (n % c === 0) { const diff = Math.abs(c - n / c); if (diff < bestDiff) { bestDiff = diff; best = c; } }
  }
  if (best) opts.add(best);
  if (n <= 8) { opts.add(n); opts.add(1); }
  const cols = [...opts].filter((c) => c >= 1 && c <= n).sort((a, b2) => a - b2).slice(0, 5);
  const preferred = best || b;
  cols.sort((a, b2) => (a === preferred ? -1 : b2 === preferred ? 1 : a - b2));
  return cols.map((c) => {
    const rows = Math.ceil(n / c);
    return { key: `g-${n}-${c}`, label: `${c} × ${rows}`, cells: gridCells(c, n) };
  });
}

// Mixed arrangements (varied cell sizes)
export function mixedVariants(n) {
  n = Math.max(1, Math.min(50, n));
  const list = [];
  (CURATED_MIXED[n] || []).forEach((m) => list.push(m));
  if (n >= 3 && n <= 16) {
    list.push({ key: `m-top-${n}`, label: "1 grande in alto", cells: heroTop(n) });
    list.push({ key: `m-left-${n}`, label: "1 grande a sinistra", cells: heroLeft(n) });
  }
  return list.length ? list : gridVariants(n);
}

export function computeVariants(n, mode) {
  return mode === "mixed" ? mixedVariants(n) : gridVariants(n);
}

export function newCells(layoutKey) {
  const layout = LAYOUTS.find((l) => l.key === layoutKey) || LAYOUTS[5];
  return layout.cells.map((c) => ({
    ...c,
    photoId: null,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    filter: "none",
    rotation: 0,
  }));
}

// Best layout for a given number of photos (used by auto-arrange)
export function chooseBestLayout(n) {
  const map = {
    1: "1-full", 2: "2-cols", 3: "3-1big-2", 4: "4-grid",
    5: "5-1big-4", 6: "6-grid", 7: "9-grid", 8: "9-grid",
    9: "9-grid", 10: "12-grid", 11: "12-grid", 12: "12-grid",
  };
  return map[Math.max(1, Math.min(12, n))] || "12-grid";
}

export const FONTS = [
  { id: "playfair", label: "Playfair", css: '"Playfair Display", serif' },
  { id: "cormorant", label: "Cormorant", css: '"Cormorant Garamond", serif' },
  { id: "montserrat", label: "Montserrat", css: '"Montserrat", sans-serif' },
  { id: "dancing", label: "Corsivo", css: '"Dancing Script", cursive' },
  { id: "inter", label: "Inter", css: '"Inter", sans-serif' },
];

export function fontCss(id) {
  return (FONTS.find((f) => f.id === id) || FONTS[0]).css;
}

let _tid = 0;
export function newText(partial = {}) {
  _tid += 1;
  return {
    id: `t${Date.now()}_${_tid}`,
    content: "Testo",
    x: 0.5, y: 0.5,
    size_cm: 1.4,
    color: "#18181A",
    font: "playfair",
    align: "center",
    rotation: 0,
    letter_spacing: 0.02,
    ...partial,
  };
}
