import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import Header from "@/components/Header";
import PhotoSidebar from "@/components/PhotoSidebar";
import SettingsPanel from "@/components/SettingsPanel";
import CanvasStage from "@/components/CanvasStage";
import WallPreview from "@/components/WallPreview";
import PrintSpec from "@/components/PrintSpec";
import FrameFinder from "@/components/FrameFinder";
import ExportDialog from "@/components/ExportDialog";
import {
  FORMATS, orientedDims, computeVariants, decorateCells, newText,
} from "@/lib/layouts";
import {
  fetchPhotos, importSamples, uploadPhoto, deletePhoto,
  saveProject, listProjects, deleteProject, exportCollage,
} from "@/lib/api";

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Studio() {
  const [photos, setPhotos] = useState([]);
  const [projects, setProjects] = useState([]);

  const [formatId, setFormatId] = useState("50x70");
  const [orientation, setOrientation] = useState("vertical");
  const [count, setCount] = useState(4);
  const [layoutMode, setLayoutMode] = useState("grid");
  const [variantKey, setVariantKey] = useState("g-4-2");
  const [cells, setCells] = useState(() => decorateCells(computeVariants(4, "grid")[0].cells));

  const [frame, setFrame] = useState({ enabled: true, color: "#121212", width_cm: 2 });
  const [mat, setMat] = useState({ enabled: true, color: "#FFFFFF", width_cm: 3 });
  const [gapCm, setGapCm] = useState(0.4);
  const [cornerRadiusCm, setCornerRadiusCm] = useState(0);
  const [bg, setBg] = useState("#FFFFFF");
  const [dpi, setDpi] = useState(300);
  const [glass, setGlass] = useState(false);

  const [texts, setTexts] = useState([]);
  const [selectedTextId, setSelectedTextId] = useState(null);

  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [projectName, setProjectName] = useState("Nuovo collage");

  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [wallOpen, setWallOpen] = useState(false);
  const [wallUrl, setWallUrl] = useState(null);
  const [wallLoading, setWallLoading] = useState(false);
  const [specOpen, setSpecOpen] = useState(false);
  const [frameFinderOpen, setFrameFinderOpen] = useState(false);
  const [pdfExportOpen, setPdfExportOpen] = useState(false);

  const photosById = useMemo(() => Object.fromEntries(photos.map((p) => [p.id, p])), [photos]);
  const format = useMemo(() => orientedDims(formatId, orientation), [formatId, orientation]);

  const refreshProjects = useCallback(async () => {
    try { setProjects(await listProjects()); } catch (e) { /* noop */ }
  }, []);

  // Initial load: photos + samples + fill
  useEffect(() => {
    (async () => {
      try {
        let ps = await fetchPhotos();
        if (ps.length === 0) {
          setImporting(true);
          ps = await importSamples();
          setImporting(false);
        }
        setPhotos(ps);
        if (ps.length) {
          setCells((prev) => prev.map((c, i) => (ps[i] ? { ...c, photoId: ps[i].id } : c)));
        }
      } catch (e) {
        toast.error("Impossibile caricare le foto iniziali");
      }
      refreshProjects();
    })();
  }, [refreshProjects]);

  // Format / orientation coherence
  const handleSetFormat = (id) => {
    const f = FORMATS.find((x) => x.id === id);
    setFormatId(id);
    if (f?.square) setOrientation("square");
    else if (orientation === "square") setOrientation("vertical");
  };

  const variants = useMemo(() => computeVariants(count, layoutMode), [count, layoutMode]);

  const preserveInto = (rects) =>
    decorateCells(rects).map((c, i) => {
      const prev = cells[i];
      return prev
        ? { ...c, photoId: prev.photoId, zoom: prev.zoom, offsetX: prev.offsetX, offsetY: prev.offsetY, filter: prev.filter, rotation: prev.rotation, aspect: prev.aspect }
        : c;
    });

  const selectVariant = (variant) => {
    setVariantKey(variant.key);
    setSelectedIndex(-1);
    setCells(preserveInto(variant.cells));
  };

  const applyCountMode = (nextCount, nextMode) => {
    const c = Math.max(1, Math.min(50, nextCount));
    setCount(c);
    setLayoutMode(nextMode);
    const vs = computeVariants(c, nextMode);
    setVariantKey(vs[0].key);
    setSelectedIndex(-1);
    setCells(preserveInto(vs[0].cells));
  };

  const handleSetCount = (n) => applyCountMode(n, layoutMode);
  const handleSetMode = (m) => applyCountMode(count, m);

  const updateCell = (index, patch) => {
    setCells((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const clearCell = (index) => {
    updateCell(index, { photoId: null, zoom: 1, offsetX: 0, offsetY: 0, filter: "none", rotation: 0 });
  };

  const firstEmpty = () => cells.findIndex((c) => !c.photoId);

  const assignPhoto = (photoId) => {
    const idx = selectedIndex >= 0 ? selectedIndex : firstEmpty();
    if (idx < 0) { toast.info("Tutte le celle sono piene. Seleziona una cella per sostituire."); return; }
    updateCell(idx, { photoId });
    toast.success("Foto inserita");
  };

  const onDropPhoto = (index, photoId) => {
    updateCell(index, { photoId });
    setSelectedIndex(index);
  };

  const onUpload = async (file) => {
    setUploading(true);
    try {
      const p = await uploadPhoto(file);
      setPhotos((prev) => [p, ...prev]);
      const idx = selectedIndex >= 0 ? selectedIndex : firstEmpty();
      if (idx >= 0) updateCell(idx, { photoId: p.id });
      toast.success(`Caricata: ${p.original_filename}`);
    } catch (e) {
      toast.error("Caricamento non riuscito");
    } finally {
      setUploading(false);
    }
  };

  const onImportSamples = async () => {
    setImporting(true);
    try {
      const ps = await importSamples();
      setPhotos((prev) => {
        const ids = new Set(prev.map((x) => x.id));
        return [...prev, ...ps.filter((x) => !ids.has(x.id))];
      });
      toast.success("Libreria di esempio caricata");
    } catch (e) {
      toast.error("Import esempi non riuscito");
    } finally {
      setImporting(false);
    }
  };

  const onDeletePhoto = async (id) => {
    await deletePhoto(id);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setCells((prev) => prev.map((c) => (c.photoId === id ? { ...c, photoId: null } : c)));
  };

  const buildSpec = useCallback(() => ({
    format: { w_cm: format.w_cm, h_cm: format.h_cm },
    dpi,
    frame,
    mat,
    gap_cm: gapCm,
    corner_radius_cm: cornerRadiusCm,
    background_color: bg,
    cells: cells.map((c) => ({
      x: c.x, y: c.y, w: c.w, h: c.h,
      photoId: c.photoId, zoom: c.zoom, offsetX: c.offsetX, offsetY: c.offsetY, filter: c.filter, rotation: c.rotation || 0, aspect: c.aspect || "fill",
    })),
    texts: texts.map((t) => ({
      id: t.id, content: t.content, x: t.x, y: t.y, size_cm: t.size_cm,
      color: t.color, font: t.font, align: t.align, rotation: t.rotation, letter_spacing: t.letter_spacing,
    })),
  }), [format, dpi, frame, mat, gapCm, cornerRadiusCm, bg, cells, texts]);

  const autoArrange = () => {
    const avail = photos.slice(0, 50);
    if (avail.length === 0) return;
    const n = avail.length;
    const vs = computeVariants(n, "grid");
    setCount(n);
    setLayoutMode("grid");
    setVariantKey(vs[0].key);
    setSelectedIndex(-1);
    setCells(decorateCells(vs[0].cells).map((c, i) => (avail[i] ? { ...c, photoId: avail[i].id } : c)));
    toast.success(`Disposizione automatica · ${n} riquadri`);
  };

  const addText = (partial) => {
    const t = newText(partial);
    setTexts((prev) => [...prev, t]);
    setSelectedTextId(t.id);
  };
  const addTitleBottom = () => addText({ content: "Il nostro titolo", x: 0.5, y: 0.94, size_cm: mat.width_cm > 1 ? 1.6 : 1.2, font: "playfair", letter_spacing: 0.06 });
  const addFreeText = () => addText({ content: "Testo", x: 0.5, y: 0.5, font: "montserrat" });
  const addCaptionForCell = () => {
    if (selectedIndex < 0) return;
    const c = cells[selectedIndex];
    addText({ content: "Didascalia", x: c.x + c.w / 2, y: Math.min(0.98, c.y + c.h - 0.02), size_cm: 0.7, font: "montserrat", color: "#FFFFFF", letter_spacing: 0.04 });
  };
  const updateText = (id, patch) => setTexts((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const removeText = (id) => {
    setTexts((prev) => prev.filter((t) => t.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  const onExport = async (fmt) => {
    setExporting(true);
    try {
      const blob = await exportCollage(buildSpec(), fmt, projectName || "collage");
      const ext = fmt === "pdf" ? "pdf" : fmt === "png" ? "png" : "jpg";
      download(blob, `${(projectName || "collage").replace(/\s+/g, "_")}.${ext}`);
      toast.success(`Esportato ${ext.toUpperCase()} · ${Math.round(format.w_cm / 2.54 * dpi)}×${Math.round(format.h_cm / 2.54 * dpi)} px`);
    } catch (e) {
      toast.error("Esportazione non riuscita");
    } finally {
      setExporting(false);
    }
  };

  const onExportPdf = async ({ paper, bleed_mm, cmyk, icc, crop_marks }) => {
    setExporting(true);
    try {
      const spec = { ...buildSpec(), dpi: 300 };
      const blob = await exportCollage(spec, "pdf", projectName || "collage", { paper, bleed_mm, cmyk, icc, crop_marks });
      download(blob, `${(projectName || "collage").replace(/\s+/g, "_")}_stampa.pdf`);
      toast.success(`PDF pronto stampa · 300 DPI${cmyk ? (icc ? " · CMYK FOGRA39" : " · CMYK") : ""}${bleed_mm ? " · bleed 3mm" : ""}${crop_marks ? " · crocini" : ""}`);
      setPdfExportOpen(false);
    } catch (e) {
      toast.error("Esportazione PDF non riuscita");
    } finally {
      setExporting(false);
    }
  };

  const onSave = async () => {
    try {
      await saveProject({ name: projectName || "Senza titolo", formatId, orientation, layoutKey: variantKey, spec: buildSpec() });
      toast.success("Progetto salvato");
      refreshProjects();
    } catch (e) {
      toast.error("Salvataggio non riuscito");
    }
  };

  const onLoadProject = (p) => {
    setProjectName(p.name);
    setFormatId(p.formatId);
    setOrientation(p.orientation);
    const s = p.spec;
    setFrame(s.frame);
    setMat(s.mat);
    setGapCm(s.gap_cm);
    setCornerRadiusCm(s.corner_radius_cm);
    setBg(s.background_color);
    setDpi(s.dpi);
    setCells(s.cells.map((c) => ({ rotation: 0, ...c })));
    setCount(s.cells.length);
    setLayoutMode("grid");
    setVariantKey(p.layoutKey || "custom");
    setTexts((s.texts || []).map((t) => ({ ...t })));
    setSelectedIndex(-1);
    setSelectedTextId(null);
    toast.success(`Progetto "${p.name}" aperto`);
  };

  const onDeleteProject = async (id) => {
    await deleteProject(id);
    refreshProjects();
    toast.success("Progetto eliminato");
  };

  const onWallPreview = async () => {
    setWallOpen(true);
    setWallLoading(true);
    setWallUrl(null);
    try {
      const spec = { ...buildSpec(), dpi: 96 };
      const blob = await exportCollage(spec, "png", "anteprima");
      setWallUrl(URL.createObjectURL(blob));
    } catch (e) {
      toast.error("Anteprima non disponibile");
    } finally {
      setWallLoading(false);
    }
  };

  const selectedCell = selectedIndex >= 0 ? cells[selectedIndex] : null;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#0d0e11]">
      <Header
        projectName={projectName} setProjectName={setProjectName}
        dpi={dpi} setDpi={setDpi}
        onSave={onSave} onWallPreview={onWallPreview} onPrintSpec={() => setSpecOpen(true)}
        onExport={onExport} onOpenPdfExport={() => setPdfExportOpen(true)} exporting={exporting}
        projects={projects} onLoadProject={onLoadProject} onDeleteProject={onDeleteProject}
      />

      <div className="flex-1 min-h-0 flex">
        <PhotoSidebar
          photos={photos}
          onUpload={onUpload}
          onImportSamples={onImportSamples}
          onAssign={assignPhoto}
          onDelete={onDeletePhoto}
          onAutoArrange={autoArrange}
          uploading={uploading}
          importing={importing}
        />

        <main className="flex-1 min-w-0 flex flex-col bg-[#14161c]">
          <CanvasStage
            format={format}
            frame={frame}
            mat={mat}
            gapCm={gapCm}
            cornerRadiusCm={cornerRadiusCm}
            bg={bg}
            glass={glass}
            cells={cells}
            photosById={photosById}
            selectedIndex={selectedIndex}
            onSelectCell={(i) => { setSelectedIndex(i); if (i >= 0) setSelectedTextId(null); }}
            onUpdateCell={updateCell}
            onDropPhoto={onDropPhoto}
            texts={texts}
            selectedTextId={selectedTextId}
            onSelectText={(id) => { setSelectedTextId(id); if (id) setSelectedIndex(-1); }}
            onUpdateText={updateText}
          />
          <div className="h-9 shrink-0 border-t border-[#2e323d] flex items-center px-4 gap-4 text-[11px] text-gray-500 font-mono">
            <span>{format.w_cm} × {format.h_cm} cm</span>
            <span>·</span>
            <span>{cells.length} riquadri</span>
            <span>·</span>
            <span>{cells.filter((c) => c.photoId).length} inserite</span>
            <span className="flex-1" />
            <span>Trascina per ritagliare · rotellina per zoom</span>
          </div>
        </main>

        <SettingsPanel
          formatId={formatId} orientation={orientation}
          count={count} layoutMode={layoutMode} variants={variants} variantKey={variantKey}
          frame={frame} mat={mat} gapCm={gapCm} cornerRadiusCm={cornerRadiusCm} bg={bg} dpi={dpi} format={format} glass={glass}
          setFormatId={handleSetFormat} setOrientation={setOrientation}
          setCount={handleSetCount} setLayoutMode={handleSetMode} selectVariant={selectVariant}
          setFrame={setFrame} setMat={setMat} setGapCm={setGapCm} setCornerRadiusCm={setCornerRadiusCm} setBg={setBg} setDpi={setDpi} setGlass={setGlass}
          onOpenFrameFinder={() => setFrameFinderOpen(true)}
          selectedIndex={selectedIndex} selectedCell={selectedCell} photosById={photosById}
          updateCell={updateCell} clearCell={clearCell}
          texts={texts} selectedText={texts.find((t) => t.id === selectedTextId) || null}
          updateText={updateText} removeText={removeText}
          addTitleBottom={addTitleBottom} addFreeText={addFreeText} addCaptionForCell={addCaptionForCell}
        />
      </div>

      <WallPreview open={wallOpen} onClose={() => setWallOpen(false)} previewUrl={wallUrl} loading={wallLoading} format={format} />
      <PrintSpec open={specOpen} onClose={() => setSpecOpen(false)} format={format} dpi={dpi} cells={cells}
        photosById={photosById} frame={frame} mat={mat} projectName={projectName} />
      <FrameFinder open={frameFinderOpen} onClose={() => setFrameFinderOpen(false)} format={format} frameColor={frame.color} />
      <ExportDialog open={pdfExportOpen} onClose={() => setPdfExportOpen(false)} format={format} onExportPdf={onExportPdf} exporting={exporting} />
    </div>
  );
}
