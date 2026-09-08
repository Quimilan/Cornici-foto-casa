import { useEffect, useRef, useState, useCallback } from "react";
import { photoUrl } from "@/lib/api";
import { CSS_FILTERS } from "@/lib/layouts";
import { ImagePlus } from "lucide-react";

function Cell({ cell, index, photo, contentW, contentH, gapPx, radiusPx, selected, onSelect, onUpdate, onDrop }) {
  const wrapRef = useRef(null);
  const drag = useRef(null);

  const cw = Math.max(1, cell.w * contentW - gapPx);
  const ch = Math.max(1, cell.h * contentH - gapPx);

  let bgStyle = {};
  if (photo) {
    const cover = Math.max(cw / photo.width, ch / photo.height);
    const scale = cover * cell.zoom;
    const dw = photo.width * scale;
    const dh = photo.height * scale;
    const px = (cw - dw) / 2 + cell.offsetX * (dw - cw) / 2;
    const py = (ch - dh) / 2 + cell.offsetY * (dh - ch) / 2;
    bgStyle = {
      backgroundImage: `url(${photoUrl(photo.id)})`,
      backgroundRepeat: "no-repeat",
      backgroundSize: `${dw}px ${dh}px`,
      backgroundPosition: `${px}px ${py}px`,
      filter: CSS_FILTERS[cell.filter] || "none",
    };
  }

  const onPointerDown = (e) => {
    onSelect(index);
    if (!photo) return;
    const cover = Math.max(cw / photo.width, ch / photo.height);
    const scale = cover * cell.zoom;
    const dw = photo.width * scale;
    const dh = photo.height * scale;
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      offX: cell.offsetX,
      offY: cell.offsetY,
      rangeX: (dw - cw) / 2 || 1,
      rangeY: (dh - ch) / 2 || 1,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!drag.current) return;
    const d = drag.current;
    let nx = d.offX + (e.clientX - d.startX) / d.rangeX;
    let ny = d.offY + (e.clientY - d.startY) / d.rangeY;
    nx = Math.max(-1, Math.min(1, nx));
    ny = Math.max(-1, Math.min(1, ny));
    onUpdate(index, { offsetX: nx, offsetY: ny });
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  const onWheel = (e) => {
    if (!selected || !photo) return;
    e.preventDefault();
    let z = cell.zoom + (e.deltaY < 0 ? 0.06 : -0.06);
    z = Math.max(1, Math.min(4, z));
    onUpdate(index, { zoom: z });
  };

  return (
    <div
      ref={wrapRef}
      data-testid={`cell-item-${index}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const pid = e.dataTransfer.getData("text/photo-id");
        if (pid) onDrop(index, pid);
      }}
      style={{
        position: "absolute",
        left: `${cell.x * contentW + gapPx / 2}px`,
        top: `${cell.y * contentH + gapPx / 2}px`,
        width: `${cw}px`,
        height: `${ch}px`,
        borderRadius: `${radiusPx}px`,
        overflow: "hidden",
        cursor: photo ? "move" : "pointer",
        outline: selected ? "2px solid #e2b15d" : "1px solid rgba(0,0,0,0.08)",
        outlineOffset: selected ? "1px" : "0",
        background: photo ? "transparent" : "rgba(0,0,0,0.04)",
        boxShadow: selected ? "0 0 0 4px rgba(226,177,93,0.18)" : "none",
        transition: "box-shadow 0.15s ease, outline-color 0.15s ease",
      }}
    >
      {photo ? (
        <div className="w-full h-full" style={bgStyle} />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-1">
          <ImagePlus className="w-5 h-5 opacity-60" />
          <span className="text-[10px] font-medium tracking-wide">Aggiungi foto</span>
        </div>
      )}
    </div>
  );
}

export default function CanvasStage({
  format, frame, mat, gapCm, cornerRadiusCm, bg,
  cells, photosById, selectedIndex, onSelectCell, onUpdateCell, onDropPhoto,
}) {
  const containerRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const measure = useCallback(() => {
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    setBox({ w: r.width - 96, h: r.height - 96 });
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  const aspect = format.w_cm / format.h_cm;
  let displayW = box.w;
  let displayH = box.w / aspect;
  if (displayH > box.h) {
    displayH = box.h;
    displayW = box.h * aspect;
  }
  displayW = Math.max(0, displayW);
  displayH = Math.max(0, displayH);

  const pxPerCm = displayW / format.w_cm || 0;
  const framePx = frame.enabled ? frame.width_cm * pxPerCm : 0;
  const matPx = mat.enabled ? mat.width_cm * pxPerCm : 0;
  const gapPx = gapCm * pxPerCm;
  const radiusPx = cornerRadiusCm * pxPerCm;
  const contentW = displayW - 2 * framePx - 2 * matPx;
  const contentH = displayH - 2 * framePx - 2 * matPx;

  return (
    <div
      ref={containerRef}
      data-testid="collage-canvas-container"
      className="flex-1 min-h-0 cs-workspace-grid flex items-center justify-center overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelectCell(-1);
      }}
    >
      {displayW > 0 && (
        <div
          className="cs-fade-up relative"
          style={{
            width: `${displayW}px`,
            height: `${displayH}px`,
            background: frame.enabled ? frame.color : bg,
            boxShadow: "0 40px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
          }}
        >
          <div
            className="absolute"
            style={{
              left: framePx, top: framePx, right: framePx, bottom: framePx,
              background: mat.enabled ? mat.color : bg,
              boxShadow: frame.enabled ? "inset 0 2px 6px rgba(0,0,0,0.28)" : "none",
            }}
          >
            <div
              className="absolute"
              style={{ left: matPx, top: matPx, width: contentW, height: contentH, background: bg }}
            >
              {contentW > 0 &&
                cells.map((cell, i) => (
                  <Cell
                    key={i}
                    cell={cell}
                    index={i}
                    photo={cell.photoId ? photosById[cell.photoId] : null}
                    contentW={contentW}
                    contentH={contentH}
                    gapPx={gapPx}
                    radiusPx={radiusPx}
                    selected={selectedIndex === i}
                    onSelect={onSelectCell}
                    onUpdate={onUpdateCell}
                    onDrop={onDropPhoto}
                  />
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
