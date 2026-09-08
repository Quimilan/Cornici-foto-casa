import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { photoUrl } from "@/lib/api";
import {
  FORMATS, LAYOUTS, FILTERS, FRAME_COLORS, MAT_COLORS,
} from "@/lib/layouts";
import { RectangleVertical, RectangleHorizontal, Square, RotateCcw, X } from "lucide-react";

const MANDATED = {
  "2-cols": "layout-grid-option-2",
  "3-1big-2": "layout-grid-option-3",
  "4-grid": "layout-grid-option-4",
  "6-grid": "layout-grid-option-6",
  "9-grid": "layout-grid-option-9",
};

function Section({ label, children }) {
  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">{label}</p>
      {children}
    </div>
  );
}

function Swatch({ active, color, onClick, testid, label }) {
  return (
    <button
      data-testid={testid}
      onClick={onClick}
      title={label}
      className="flex flex-col items-center gap-1.5 group"
    >
      <span
        className="w-9 h-9 rounded-full border-2 transition-colors"
        style={{ background: color, borderColor: active ? "#e2b15d" : "#3a3f4c" }}
      />
      <span className={`text-[10px] ${active ? "text-[#e2b15d]" : "text-gray-500"}`}>{label}</span>
    </button>
  );
}

export default function SettingsPanel(props) {
  const {
    formatId, orientation, layoutKey, frame, mat, gapCm, cornerRadiusCm, bg, dpi, format,
    setFormatId, setOrientation, setLayoutKey, setFrame, setMat, setGapCm, setCornerRadiusCm, setBg, setDpi,
    selectedIndex, selectedCell, photosById, updateCell, clearCell,
  } = props;

  const activeFormat = FORMATS.find((f) => f.id === formatId) || FORMATS[2];
  const groups = [...new Set(FORMATS.map((f) => f.group))];

  const photo = selectedCell && selectedCell.photoId ? photosById[selectedCell.photoId] : null;

  let dpiInfo = null;
  if (photo && selectedCell) {
    const cellWin = (selectedCell.w * format.w_cm) / 2.54;
    const cellHin = (selectedCell.h * format.h_cm) / 2.54;
    const eff = Math.floor(
      Math.min(photo.width / cellWin, photo.height / cellHin) / selectedCell.zoom
    );
    let tone = "text-emerald-400", verdict = "Eccellente per la stampa";
    if (eff < 150) { tone = "text-red-400"; verdict = "Bassa · scegli una foto più grande"; }
    else if (eff < 300) { tone = "text-amber-400"; verdict = "Buona · accettabile"; }
    dpiInfo = { eff, tone, verdict };
  }

  return (
    <aside className="w-[340px] shrink-0 border-l border-[#2e323d] bg-[#14161c] h-full flex flex-col">
      <Tabs defaultValue="format" className="flex flex-col h-full">
        <div className="px-4 pt-4">
          <TabsList className="w-full grid grid-cols-3 bg-[#1e2028]">
            <TabsTrigger value="format" data-testid="tab-format">Formato</TabsTrigger>
            <TabsTrigger value="frame" data-testid="tab-frame">Cornice</TabsTrigger>
            <TabsTrigger value="cell" data-testid="tab-cell">Cella</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto cs-scroll p-4">
          {/* FORMATO */}
          <TabsContent value="format" className="mt-0 space-y-6">
            <Section label="Formato di stampa">
              <Select value={formatId} onValueChange={setFormatId}>
                <SelectTrigger data-testid="format-selector-dropdown" className="bg-[#1e2028] border-[#2e323d] text-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectGroup key={g}>
                      <SelectLabel className="text-gray-400">{g}</SelectLabel>
                      {FORMATS.filter((f) => f.group === g).map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 font-mono">
                {format.w_cm} × {format.h_cm} cm · consigliati {Math.round(format.w_cm / 2.54 * 300)}×{Math.round(format.h_cm / 2.54 * 300)} px a 300 DPI
              </p>
            </Section>

            <Section label="Orientamento">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "vertical", icon: RectangleVertical, label: "Verticale", tid: "orientation-vertical-button" },
                  { id: "horizontal", icon: RectangleHorizontal, label: "Orizzontale", tid: "orientation-horizontal-button" },
                  { id: "square", icon: Square, label: "Quadrato", tid: "orientation-square-button" },
                ].map((o) => {
                  const disabled = o.id === "square" ? !activeFormat.square : activeFormat.square;
                  const active = orientation === o.id;
                  return (
                    <button
                      key={o.id}
                      data-testid={o.tid}
                      disabled={disabled}
                      onClick={() => setOrientation(o.id)}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border transition-colors ${
                        active ? "border-[#e2b15d] bg-[#e2b15d]/10 text-[#e2b15d]"
                          : "border-[#2e323d] text-gray-400 hover:bg-[#23262f] hover:text-gray-200"
                      } disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                      <o.icon className="w-5 h-5" />
                      <span className="text-[10px]">{o.label}</span>
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section label="Disposizione foto">
              <div className="grid grid-cols-2 gap-2">
                {LAYOUTS.map((l) => (
                  <button
                    key={l.key}
                    data-testid={MANDATED[l.key] || `layout-${l.key}`}
                    onClick={() => setLayoutKey(l.key)}
                    className={`text-left px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                      layoutKey === l.key ? "border-[#e2b15d] bg-[#e2b15d]/10 text-[#e2b15d]"
                        : "border-[#2e323d] text-gray-300 hover:bg-[#23262f]"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </Section>
          </TabsContent>

          {/* CORNICE */}
          <TabsContent value="frame" className="mt-0 space-y-6">
            <Section label="Cornice">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Mostra cornice</span>
                <Switch
                  data-testid="frame-toggle"
                  checked={frame.enabled}
                  onCheckedChange={(v) => setFrame({ ...frame, enabled: v })}
                />
              </div>
              <div className="flex justify-between pt-1">
                {FRAME_COLORS.map((c) => (
                  <Swatch
                    key={c.id}
                    testid={`frame-color-${c.id}`}
                    label={c.label}
                    color={c.color}
                    active={frame.color === c.color}
                    onClick={() => setFrame({ ...frame, enabled: true, color: c.color })}
                  />
                ))}
              </div>
              <div className="pt-1">
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span>Spessore cornice</span><span className="font-mono">{frame.width_cm.toFixed(1)} cm</span>
                </div>
                <Slider value={[frame.width_cm]} min={0.5} max={6} step={0.5}
                  onValueChange={([v]) => setFrame({ ...frame, width_cm: v })} />
              </div>
            </Section>

            <Section label="Passe-partout">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Attiva passe-partout</span>
                <Switch
                  data-testid="passepartout-toggle"
                  checked={mat.enabled}
                  onCheckedChange={(v) => setMat({ ...mat, enabled: v })}
                />
              </div>
              <div className="flex gap-4 pt-1">
                {MAT_COLORS.map((c) => (
                  <Swatch
                    key={c.id}
                    testid={`mat-color-${c.id}`}
                    label={c.label}
                    color={c.color}
                    active={mat.color === c.color}
                    onClick={() => setMat({ ...mat, enabled: true, color: c.color })}
                  />
                ))}
              </div>
              <div className="pt-1">
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span>Margine passe-partout</span><span className="font-mono">{mat.width_cm.toFixed(1)} cm</span>
                </div>
                <Slider value={[mat.width_cm]} min={0} max={8} step={0.5}
                  onValueChange={([v]) => setMat({ ...mat, width_cm: v })} />
              </div>
            </Section>

            <Section label="Griglia">
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span>Spaziatura tra foto</span><span className="font-mono">{gapCm.toFixed(1)} cm</span>
                </div>
                <Slider value={[gapCm]} min={0} max={2} step={0.1} onValueChange={([v]) => setGapCm(v)} />
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span>Angoli arrotondati</span><span className="font-mono">{cornerRadiusCm.toFixed(1)} cm</span>
                </div>
                <Slider value={[cornerRadiusCm]} min={0} max={2} step={0.1} onValueChange={([v]) => setCornerRadiusCm(v)} />
              </div>
              <div className="flex gap-3 pt-1">
                {["#FFFFFF", "#000000", "#F8F5EE"].map((c) => (
                  <Swatch key={c} testid={`bg-color-${c}`} label="Sfondo" color={c} active={bg === c} onClick={() => setBg(c)} />
                ))}
              </div>
            </Section>
          </TabsContent>

          {/* CELLA */}
          <TabsContent value="cell" className="mt-0 space-y-6">
            {!selectedCell ? (
              <div className="text-center text-gray-500 text-sm mt-10 px-4">
                Seleziona una cella sul collage per regolare foto, zoom e filtri.
              </div>
            ) : (
              <>
                <Section label={`Cella ${selectedIndex + 1}`}>
                  {photo ? (
                    <div className="flex items-center gap-3">
                      <img src={photoUrl(photo.id)} alt="" className="w-14 h-14 rounded-lg object-cover border border-[#2e323d]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-300 truncate">{photo.original_filename}</p>
                        {dpiInfo && (
                          <p className={`text-[11px] font-mono ${dpiInfo.tone}`}>
                            ~{dpiInfo.eff} DPI · {dpiInfo.verdict}
                          </p>
                        )}
                      </div>
                      <button
                        data-testid="remove-cell-photo"
                        onClick={() => clearCell(selectedIndex)}
                        className="p-2 rounded-lg border border-[#2e323d] text-gray-400 hover:text-red-400 hover:border-red-400/50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Nessuna foto. Clicca una miniatura a sinistra o trascinala qui.
                    </p>
                  )}
                </Section>

                {photo && (
                  <>
                    <Section label="Zoom">
                      <div className="flex items-center gap-3">
                        <Slider className="flex-1" value={[selectedCell.zoom]} min={1} max={4} step={0.05}
                          onValueChange={([v]) => updateCell(selectedIndex, { zoom: v })} />
                        <span className="text-xs font-mono text-gray-400 w-10 text-right">{selectedCell.zoom.toFixed(2)}×</span>
                        <button
                          data-testid="reset-cell-button"
                          onClick={() => updateCell(selectedIndex, { zoom: 1, offsetX: 0, offsetY: 0 })}
                          className="p-2 rounded-lg border border-[#2e323d] text-gray-400 hover:text-[#e2b15d]"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-500">Trascina la foto nella cella per riposizionarla.</p>
                    </Section>

                    <Section label="Filtro colore">
                      <div className="grid grid-cols-2 gap-2">
                        {FILTERS.map((f) => (
                          <button
                            key={f.id}
                            data-testid={`filter-${f.id}`}
                            onClick={() => updateCell(selectedIndex, { filter: f.id })}
                            className={`px-3 py-2 rounded-lg border text-xs transition-colors ${
                              selectedCell.filter === f.id ? "border-[#e2b15d] bg-[#e2b15d]/10 text-[#e2b15d]"
                                : "border-[#2e323d] text-gray-300 hover:bg-[#23262f]"
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </Section>
                  </>
                )}
              </>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  );
}
