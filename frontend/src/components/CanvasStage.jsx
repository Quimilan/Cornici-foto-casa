import { useEffect, useRef, useState, useCallback } from "react";
import { photoUrl } from "@/lib/api";
import { CSS_FILTERS, fontCss } from "@/lib/layouts";
import { ImagePlus } from "lucide-react";

function Cell({ cell, index, photo, contentW, contentH, gapPx, radiusPx, bg, selected, onSelect, onUpdate, onDrop }) {
  const drag = useRef(null);

  const cw = Math.max(1, cell.w * contentW - gapPx);
  const ch = Math.max(1, cell.h * contentH - gapPx);

  // inner box for a target aspect (square, 3:2, ...)
  let bw = cw, bh = ch, boxLeft = 0, boxTop = 0;
  if (cell.aspect && cell.aspect !== "fill" && cell.aspect.includes(":")) {
    const [tw, th] = cell.aspect.split(":").map(Number);
    const target = tw / th;
    if (cw / ch > target) { bh = ch; bw = ch * target; }
    else { bw = cw; bh = cw / target; }
    boxLeft = (cw - bw) / 2;
    boxTop = (ch - bh) / 2;
  }

  let inner = null;
  if (photo) {
    const rad = (cell.rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const iw = photo.width, ih = photo.height;
    const RW = iw * cos + ih * sin;
    const RH = iw * sin + ih * cos;
    const cover = Math.max(bw / RW, bh / RH);
    const scale = cover * cell.zoom;
    const sw = iw * scale, sh = ih * scale;
    const dw = RW * scale, dh = RH * scale;
    const px = (bw - dw) / 2 + cell.offsetX * (dw - bw) / 2;
    const py = (bh - dh) / 2 + cell.offsetY * (dh - bh) / 2;
    const cx = px + dw / 2, cy = py + dh / 2;
    inner = {
      position: "absolute",
      width: `${sw}px`,
      height: `${sh}px`,
      left: `${cx - sw / 2}px`,
      top: `${cy - sh / 2}px`,
      transform: `rotate(${cell.rotation}deg)`,
      transformOrigin: "center center",
      backgroundImage: `url(${photoUrl(photo.id)})`,
      backgroundSize: "100% 100%",
      backgroundRepeat: "no-repeat",
      filter: CSS_FILTERS[cell.filter] || "none",
    };
    drag.metrics = { rangeX: (dw - bw) / 2 || 1, rangeY: (dh - bh) / 2 || 1 };
  }

  const onPointerDown = (e) => {
    onSelect(index);
    if (!photo) return;
    drag.current = {
      startX: e.clientX, startY: e.clientY,
      offX: cell.offsetX, offY: cell.offsetY,
      rangeX: drag.metrics.rangeX, rangeY: drag.metrics.rangeY,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const d = drag.current;
    let nx = d.offX + (e.clientX - d.startX) / d.rangeX;
    let ny = d.offY + (e.clientY - d.startY) / d.rangeY;
    onUpdate(index, { offsetX: Math.max(-1, Math.min(1, nx)), offsetY: Math.max(-1, Math.min(1, ny)) });
  };
  const onPointerUp = () => { drag.current = null; };
  const onWheel = (e) => {
    if (!selected || !photo) return;
    e.preventDefault();
    let z = cell.zoom + (e.deltaY < 0 ? 0.06 : -0.06);
    onUpdate(index, { zoom: Math.max(1, Math.min(5, z)) });
  };

  return (
    <div
      data-testid={`cell-item-${index}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); const pid = e.dataTransfer.getData("text/photo-id"); if (pid) onDrop(index, pid); }}
      style={{
        position: "absolute",
        left: `${cell.x * contentW + gapPx / 2}px`,
        top: `${cell.y * contentH + gapPx / 2}px`,
        width: `${cw}px`, height: `${ch}px`,
        borderRadius: `${radiusPx}px`,
        overflow: "hidden",
        cursor: photo ? "move" : "pointer",
        outline: selected ? "2px solid #e2b15d" : "1px solid rgba(0,0,0,0.08)",
        outlineOffset: selected ? "1px" : "0",
        background: bg || "#eee",
        boxShadow: selected ? "0 0 0 4px rgba(226,177,93,0.18)" : "none",
        transition: "box-shadow 0.15s ease, outline-color 0.15s ease",
      }}
    >
      {photo ? (
        <div style={{ position: "absolute", left: `${boxLeft}px`, top: `${boxTop}px`, width: `${bw}px`, height: `${bh}px`, overflow: "hidden", borderRadius: `${radiusPx}px`, background: bg || "#eee" }}>
          <div style={inner} />
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-1 pointer-events-none">
          <ImagePlus className="w-5 h-5 opacity-60" />
          <span className="text-[10px] font-medium tracking-wide">Aggiungi foto</span>
        </div>
      )}
    </div>
  );
}

function TextItem({ t, displayW, displayH, pxPerCm, selected, onSelect, onUpdate }) {
  const drag = useRef(null);
  const fontPx = t.size_cm * pxPerCm;

  const onPointerDown = (e) => {
    e.stopPropagation();
    onSelect(t.id);
    drag.current = { sx: e.clientX, sy: e.clientY, x: t.x, y: t.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const d = drag.current;
    const nx = d.x + (e.clientX - d.sx) / displayW;
    const ny = d.y + (e.clientY - d.sy) / displayH;
    onUpdate(t.id, { x: Math.max(0, Math.min(1, nx)), y: Math.max(0, Math.min(1, ny)) });
  };
  const onPointerUp = () => { drag.current = null; };

  return (
    <div
      data-testid={`text-item-${t.id}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: "absolute",
        left: `${t.x * displayW}px`,
        top: `${t.y * displayH}px`,
        transform: `translate(-50%, -50%) rotate(${t.rotation}deg)`,
        fontFamily: fontCss(t.font),
        fontSize: `${fontPx}px`,
        lineHeight: 1.1,
        color: t.color,
        letterSpacing: `${t.letter_spacing}em`,
        whiteSpace: "nowrap",
        cursor: "move",
        userSelect: "none",
        pointerEvents: "auto",
        padding: "2px 6px",
        outline: selected ? "1.5px dashed #e2b15d" : "none",
        borderRadius: "4px",
      }}
    >
      {t.content || " "}
    </div>
  );
}

export default function CanvasStage({
  format, frame, mat, gapCm, cornerRadiusCm, bg, glass,
  cells, photosById, selectedIndex, onSelectCell, onUpdateCell, onDropPhoto,
  texts, selectedTextId, onSelectText, onUpdateText,
}) {
  const containerRef = useRef(null);
  const [boxSize, setBoxSize] = useState({ w: 0, h: 0 });

  const measure = useCallback(() => {
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    setBoxSize({ w: r.width - 96, h: r.height - 96 });
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  const aspect = format.w_cm / format.h_cm;
  let displayW = boxSize.w;
  let displayH = boxSize.w / aspect;
  if (displayH > boxSize.h) { displayH = boxSize.h; displayW = boxSize.h * aspect; }
  displayW = Math.max(0, displayW);
  displayH = Math.max(0, displayH);

  const pxPerCm = displayW / format.w_cm || 0;
  const framePx = frame.enabled ? frame.width_cm * pxPerCm : 0;
  const matPx = mat.enabled ? mat.width_cm * pxPerCm : 0;
  const gapPx = gapCm * pxPerCm;
  const radiusPx = cornerRadiusCm * pxPerCm;
  const contentW = displayW - 2 * framePx - 2 * matPx;
  const contentH = displayH - 2 * framePx - 2 * matPx;

  const isWood = frame.color === "#C29B6C";
  const isMetal = frame.color === "#8E9196";
  const frameBg = frame.enabled
    ? (isWood
        ? "linear-gradient(135deg, #d8b483 0%, #b98a54 45%, #caa06d 100%)"
        : isMetal
          ? "linear-gradient(135deg, #b7bcc2 0%, #7d838b 50%, #aeb3ba 100%)"
          : frame.color)
    : bg;

  return (
    <div
      ref={containerRef}
      data-testid="collage-canvas-container"
      className="flex-1 min-h-0 cs-workspace-grid flex items-center justify-center overflow-hidden"
      onPointerDown={(e) => { if (e.target === e.currentTarget) { onSelectCell(-1); onSelectText(null); } }}
    >
      {displayW > 0 && (
        <div
          className="cs-fade-up relative"
          style={{
            width: `${displayW}px`, height: `${displayH}px`,
            background: frameBg,
            boxShadow: frame.enabled
              ? "0 40px 80px -20px rgba(0,0,0,0.7), inset 0 2px 3px rgba(255,255,255,0.25), inset 0 -3px 6px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.3)"
              : "0 40px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
          }}
        >
          {/* mat */}
          <div
            className="absolute"
            style={{
              left: framePx, top: framePx, right: framePx, bottom: framePx,
              background: mat.enabled ? mat.color : bg,
              boxShadow: (frame.enabled || mat.enabled) ? "inset 0 2px 8px rgba(0,0,0,0.28)" : "none",
            }}
          >
            <div className="absolute" style={{ left: matPx, top: matPx, width: contentW, height: contentH, background: bg }}>
              {contentW > 0 && cells.map((cell, i) => (
                <Cell
                  key={i} cell={cell} index={i}
                  photo={cell.photoId ? photosById[cell.photoId] : null}
                  contentW={contentW} contentH={contentH} gapPx={gapPx} radiusPx={radiusPx} bg={bg}
                  selected={selectedIndex === i}
                  onSelect={onSelectCell} onUpdate={onUpdateCell} onDrop={onDropPhoto}
                />
              ))}
            </div>
          </div>

          {/* text overlay (full canvas) */}
          <div className="absolute inset-0" style={{ pointerEvents: "none" }}>
            {texts.map((t) => (
              <TextItem
                key={t.id} t={t} displayW={displayW} displayH={displayH} pxPerCm={pxPerCm}
                selected={selectedTextId === t.id} onSelect={onSelectText} onUpdate={onUpdateText}
              />
            ))}
          </div>

          {/* anti-glare glass (preview only) */}
          {glass && (
            <div
              className="absolute inset-0"
              style={{
                pointerEvents: "none",
                background:
                  "linear-gradient(115deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.05) 18%, rgba(255,255,255,0) 34%, rgba(255,255,255,0) 62%, rgba(255,255,255,0.10) 80%, rgba(255,255,255,0.02) 100%)",
                mixBlendMode: "screen",
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
