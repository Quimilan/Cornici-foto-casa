import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ExternalLink, ShoppingBag } from "lucide-react";

const COLOR_LABEL = {
  "#121212": "nera",
  "#FAFAFA": "bianca",
  "#C29B6C": "legno",
  "#8E9196": "alluminio",
};

export default function FrameFinder({ open, onClose, format, frameColor }) {
  const w = Math.round(format.w_cm);
  const h = Math.round(format.h_cm);
  const colorWord = COLOR_LABEL[frameColor] || "";
  const size = `${w}x${h}`;
  const q = encodeURIComponent(`cornice ${size} ${colorWord}`.trim());
  const qEn = encodeURIComponent(`picture frame ${size} cm ${colorWord}`.trim());

  const shops = [
    { name: "Amazon.it", desc: "Ampia scelta, consegna rapida", url: `https://www.amazon.it/s?k=${q}`, tone: "#FF9900" },
    { name: "IKEA", desc: "Cornici essenziali ed economiche", url: `https://www.ikea.com/it/it/search/?q=${encodeURIComponent(`cornice ${size}`)}`, tone: "#0058A3" },
    { name: "ifolor", desc: "Cornici da galleria per collage", url: "https://www.ifolor.it/decorazioni-da-parete/cornice-da-galleria-per-foto-collage", tone: "#E2001A" },
    { name: "Leroy Merlin", desc: "Cornici e supporti per la parete", url: `https://www.leroymerlin.it/ricerca?q=${encodeURIComponent(`cornice ${size}`)}`, tone: "#78BE20" },
    { name: "Etsy", desc: "Cornici artigianali e su misura", url: `https://www.etsy.com/it/search?q=${qEn}`, tone: "#F1641E" },
    { name: "Google Shopping", desc: "Confronta prezzi da più negozi", url: `https://www.google.com/search?tbm=shop&q=${q}`, tone: "#4285F4" },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg bg-[#14161c] border-[#2e323d] text-gray-100" data-testid="frame-finder-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#e2b15d]" /> Trova cornici {size} cm {colorWord}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Apri i risultati di ricerca dal vivo per il tuo formato esatto: prezzi e disponibilità sempre aggiornati sul sito del negozio.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-gray-400 -mt-2 mb-2">
          Scegli un negozio qui sotto per vedere le cornici disponibili adesso.
        </p>
        <div className="grid grid-cols-1 gap-2">
          {shops.map((s) => (
            <a
              key={s.name}
              data-testid={`frame-shop-${s.name.toLowerCase().replace(/[^a-z]/g, "")}`}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#2e323d] bg-[#1e2028] hover:bg-[#23262f] hover:border-[#e2b15d]/50 transition-colors group"
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.tone }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-100">{s.name}</p>
                <p className="text-xs text-gray-500">{s.desc}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-[#e2b15d]" />
            </a>
          ))}
        </div>
        <p className="text-[11px] text-gray-500 mt-1">
          Suggerimento: scegli una cornice con passe-partout se nel progetto hai attivato il margine, così le proporzioni combaceranno.
        </p>
      </DialogContent>
    </Dialog>
  );
}
