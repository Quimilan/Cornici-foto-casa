import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { PAPER_FORMATS, paperDims } from "@/lib/layouts";
import { FileText, Loader2, RectangleVertical, RectangleHorizontal } from "lucide-react";

export default function ExportDialog({ open, onClose, format, onExportPdf, exporting }) {
  const [paperId, setPaperId] = useState("auto");
  const [paperOrientation, setPaperOrientation] = useState("vertical");
  const [bleed, setBleed] = useState(true);
  const [cmyk, setCmyk] = useState(true);

  const DPI = 300;
  const page = paperId === "auto" ? { w_cm: format.w_cm, h_cm: format.h_cm } : paperDims(paperId, paperOrientation);
  const bleedCm = bleed ? 0.3 : 0;
  const finalW = page.w_cm + 2 * bleedCm;
  const finalH = page.h_cm + 2 * bleedCm;
  const px = (cm) => Math.round((cm / 2.54) * DPI);

  const handleExport = () => {
    onExportPdf({
      paper: paperId === "auto" ? null : paperDims(paperId, paperOrientation),
      bleed_mm: bleed ? 3 : 0,
      cmyk,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md bg-[#14161c] border-[#2e323d] text-gray-100" data-testid="export-pdf-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#e2b15d]" /> Esporta PDF pronto stampa
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            PDF professionale a 300 DPI con margini al vivo e colori CMYK.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-2">Formato carta</p>
            <Select value={paperId} onValueChange={setPaperId}>
              <SelectTrigger data-testid="paper-format-select" className="bg-[#1e2028] border-[#2e323d] text-gray-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAPER_FORMATS.map((p) => (<SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          {paperId !== "auto" && (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-2">Orientamento carta</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "vertical", icon: RectangleVertical, label: "Verticale" },
                  { id: "horizontal", icon: RectangleHorizontal, label: "Orizzontale" },
                ].map((o) => (
                  <button key={o.id} data-testid={`paper-orientation-${o.id}`} onClick={() => setPaperOrientation(o.id)}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs transition-colors ${paperOrientation === o.id ? "border-[#e2b15d] bg-[#e2b15d]/10 text-[#e2b15d]" : "border-[#2e323d] text-gray-300 hover:bg-[#23262f]"}`}>
                    <o.icon className="w-4 h-4" /> {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 rounded-xl border border-[#2e323d] bg-[#1e2028] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-200">Margini al vivo (bleed 3 mm)</p>
                <p className="text-[10px] text-gray-500">Evita bordi bianchi dopo il taglio</p>
              </div>
              <Switch data-testid="bleed-toggle" checked={bleed} onCheckedChange={setBleed} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-200">Colori CMYK</p>
                <p className="text-[10px] text-gray-500">Modalità colore per la stampa professionale</p>
              </div>
              <Switch data-testid="cmyk-toggle" checked={cmyk} onCheckedChange={setCmyk} />
            </div>
          </div>

          <div className="rounded-xl bg-[#0d0e11] border border-[#2e323d] p-4 font-mono text-xs text-gray-400 space-y-1">
            <div className="flex justify-between"><span>Risoluzione</span><span className="text-gray-200">300 DPI</span></div>
            <div className="flex justify-between"><span>Pagina rifilata</span><span className="text-gray-200">{page.w_cm.toFixed(1)} × {page.h_cm.toFixed(1)} cm</span></div>
            <div className="flex justify-between"><span>Con bleed</span><span className="text-gray-200">{finalW.toFixed(1)} × {finalH.toFixed(1)} cm</span></div>
            <div className="flex justify-between"><span>Pixel finali</span><span className="text-gray-200">{px(finalW)} × {px(finalH)} px</span></div>
            <div className="flex justify-between"><span>Colore</span><span className="text-gray-200">{cmyk ? "CMYK" : "RGB"}</span></div>
          </div>

          <Button data-testid="confirm-pdf-export-button" onClick={handleExport} disabled={exporting}
            className="w-full bg-[#e2b15d] text-[#101216] hover:bg-[#f0c473] font-semibold">
            {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            Scarica PDF pronto stampa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
