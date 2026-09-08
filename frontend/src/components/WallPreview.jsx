import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

const ROOM = "https://images.unsplash.com/photo-1600210491369-e753d80a41f3?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600";

export default function WallPreview({ open, onClose, previewUrl, loading, format }) {
  const aspect = format.w_cm / format.h_cm;
  // scale the framed collage to occupy a believable share of the wall
  const maxH = 46; // % of room height
  const height = maxH;
  const width = height * aspect * (9 / 16); // rough perspective compensation

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl bg-[#14161c] border-[#2e323d] text-gray-100 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3">
          <DialogTitle className="font-display text-white">Vista Parete Soggiorno</DialogTitle>
          <DialogDescription className="text-gray-400">Simulazione del collage incorniciato appeso a parete.</DialogDescription>
        </DialogHeader>
        <div className="relative w-full" style={{ aspectRatio: "16 / 10" }} data-testid="wall-preview-canvas">
          <img src={ROOM} alt="soggiorno" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/10" />
          <div
            className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 shadow-2xl"
            style={{ height: `${height}%`, width: `${width}%` }}
          >
            {loading ? (
              <div className="w-full h-full flex items-center justify-center bg-black/40">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              </div>
            ) : previewUrl ? (
              <img src={previewUrl} alt="collage" className="w-full h-full object-contain drop-shadow-2xl" />
            ) : null}
          </div>
        </div>
        <p className="px-6 py-4 text-xs text-gray-400">
          Simulazione indicativa dell'ingombro a parete. Le proporzioni reali dipendono dalla stanza.
        </p>
      </DialogContent>
    </Dialog>
  );
}
