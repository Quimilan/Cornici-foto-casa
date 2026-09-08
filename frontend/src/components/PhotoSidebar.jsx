import { useRef } from "react";
import { photoUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Upload, Images, Trash2, Loader2, Wand2 } from "lucide-react";

function megapixels(p) {
  return ((p.width * p.height) / 1e6).toFixed(1);
}

export default function PhotoSidebar({ photos, onUpload, onImportSamples, onAssign, onDelete, onAutoArrange, uploading, importing }) {
  const inputRef = useRef(null);

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f) => onUpload(f));
    e.target.value = "";
  };

  return (
    <aside className="w-[300px] shrink-0 border-r border-[#2e323d] bg-[#14161c] flex flex-col h-full">
      <div className="p-4 border-b border-[#2e323d]">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400 mb-3">Le tue foto</p>
        <input
          ref={inputRef}
          data-testid="photo-upload-input"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
        <Button
          data-testid="upload-trigger-button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full bg-[#e2b15d] text-[#101216] hover:bg-[#f0c473] font-semibold"
        >
          {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
          Carica foto
        </Button>
        <Button
          data-testid="sample-photo-library-button"
          onClick={onImportSamples}
          disabled={importing}
          variant="outline"
          className="w-full mt-2 border-[#2e323d] bg-transparent text-gray-200 hover:bg-[#23262f] hover:text-white"
        >
          {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Images className="w-4 h-4 mr-2" />}
          Libreria di esempio
        </Button>
        <Button
          data-testid="auto-arrange-button"
          onClick={onAutoArrange}
          disabled={photos.length === 0}
          className="w-full mt-2 bg-[#23262f] text-[#e2b15d] border border-[#e2b15d]/40 hover:bg-[#e2b15d] hover:text-[#101216] font-semibold disabled:opacity-40"
        >
          <Wand2 className="w-4 h-4 mr-2" />
          Disposizione automatica
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto cs-scroll p-4">
        {photos.length === 0 ? (
          <div className="text-center text-gray-500 text-sm mt-10 px-4">
            Nessuna foto. Carica le tue immagini ad alta risoluzione o prova la libreria di esempio.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {photos.map((p) => (
              <div
                key={p.id}
                data-testid={`photo-thumb-${p.id}`}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/photo-id", p.id)}
                onClick={() => onAssign(p.id)}
                className="group relative aspect-square rounded-lg overflow-hidden border border-[#2e323d] cursor-pointer bg-[#1e2028]"
                title="Clicca per inserire nella cella selezionata"
              >
                <img
                  src={photoUrl(p.id)}
                  alt={p.original_filename}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span className="absolute bottom-1 left-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/70 text-white">
                  {megapixels(p)} MP
                </span>
                <button
                  data-testid={`delete-photo-${p.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(p.id);
                  }}
                  className="absolute top-1 right-1 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
