import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-[#2e323d]">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm font-mono text-gray-100">{value}</span>
    </div>
  );
}

export default function PrintSpec({ open, onClose, format, dpi, cells, photosById, frame, mat, projectName }) {
  const wpx = Math.round((format.w_cm / 2.54) * dpi);
  const hpx = Math.round((format.h_cm / 2.54) * dpi);
  const filled = cells.filter((c) => c.photoId);

  const cellHealth = filled.map((c, i) => {
    const p = photosById[c.photoId];
    if (!p) return { i, eff: 0, tone: "red" };
    const cellWin = (c.w * format.w_cm) / 2.54;
    const cellHin = (c.h * format.h_cm) / 2.54;
    const eff = Math.floor(Math.min(p.width / cellWin, p.height / cellHin) / c.zoom);
    const tone = eff >= 300 ? "ok" : eff >= 150 ? "warn" : "red";
    return { i, eff, tone, name: p.original_filename };
  });

  const Icon = { ok: CheckCircle2, warn: AlertTriangle, red: XCircle };
  const color = { ok: "text-emerald-400", warn: "text-amber-400", red: "text-red-400" };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg bg-[#14161c] border-[#2e323d] text-gray-100" data-testid="print-spec-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-white">Specifiche per il centro stampa</DialogTitle>
          <DialogDescription className="text-gray-400">Riepilogo tecnico del file pronto per la stampa.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Row label="Progetto" value={projectName} />
          <Row label="Formato finito" value={`${format.w_cm} × ${format.h_cm} cm`} />
          <Row label="Risoluzione file" value={`${wpx} × ${hpx} px`} />
          <Row label="Densità" value={`${dpi} DPI`} />
          <Row label="Spazio colore" value="RGB · converti in CMYK per la stampa" />
          <Row label="Cornice" value={frame.enabled ? `${frame.width_cm} cm` : "Nessuna"} />
          <Row label="Passe-partout" value={mat.enabled ? `${mat.width_cm} cm` : "Nessuno"} />
          <Row label="Foto inserite" value={`${filled.length} / ${cells.length}`} />
        </div>

        <div className="mt-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-2">Qualità per foto</p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto cs-scroll pr-1">
            {cellHealth.length === 0 ? (
              <p className="text-sm text-gray-500">Nessuna foto inserita.</p>
            ) : (
              cellHealth.map((h) => {
                const I = Icon[h.tone];
                return (
                  <div key={h.i} className="flex items-center gap-2 text-sm">
                    <I className={`w-4 h-4 ${color[h.tone]}`} />
                    <span className="text-gray-300 truncate flex-1">Cella {h.i + 1} · {h.name}</span>
                    <span className={`font-mono text-xs ${color[h.tone]}`}>~{h.eff} DPI</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
