import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { photoUrl } from "@/lib/api";
import {
  FORMATS, LAYOUTS, FILTERS, FRAME_COLORS, MAT_COLORS, FONTS, fontCss,
} from "@/lib/layouts";
import {
  RectangleVertical, RectangleHorizontal, Square, RotateCcw, RotateCw, X,
  Type, Heading, MessageSquare, Trash2, ShoppingBag,
} from "lucide-react";

const MANDATED = {
  "2-cols": "layout-grid-option-2",
  "3-1big-2": "layout-grid-option-3",
  "4-grid": "layout-grid-option-4",
  "6-grid": "layout-grid-option-6",
  "9-grid": "layout-grid-option-9",
};

const TEXT_COLORS = ["#18181A", "#FFFFFF", "#E2B15D", "#8a6d3b", "#6B7280", "#B91C1C"];

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
    <button data-testid={testid} onClick={onClick} title={label} className="flex flex-col items-center gap-1.5">
      <span className="w-9 h-9 rounded-full border-2 transition-colors" style={{ background: color, borderColor: active ? "#e2b15d" : "#3a3f4c" }} />
      <span className={`text-[10px] ${active ? "text-[#e2b15d]" : "text-gray-500"}`}>{label}</span>
    </button>
  );
}

function LabeledSlider({ label, display, unit, ...rest }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1.5">
        <span>{label}</span><span className="font-mono">{display}{unit}</span>
      </div>
      <Slider {...rest} />
    </div>
  );
}

export default function SettingsPanel(props) {
  const {
    formatId, orientation, layoutKey, frame, mat, gapCm, cornerRadiusCm, bg, dpi, format, glass,
    setFormatId, setOrientation, setLayoutKey, setFrame, setMat, setGapCm, setCornerRadiusCm, setBg, setDpi, setGlass,
    onOpenFrameFinder,
    selectedIndex, selectedCell, photosById, updateCell, clearCell,
    texts, selectedText, updateText, removeText, addTitleBottom, addFreeText, addCaptionForCell,
  } = props;

  const activeFormat = FORMATS.find((f) => f.id === formatId) || FORMATS[2];
  const groups = [...new Set(FORMATS.map((f) => f.group))];
  const photo = selectedCell && selectedCell.photoId ? photosById[selectedCell.photoId] : null;

  let dpiInfo = null;
  if (photo && selectedCell) {
    const cellWin = (selectedCell.w * format.w_cm) / 2.54;
    const cellHin = (selectedCell.h * format.h_cm) / 2.54;
    const eff = Math.floor(Math.min(photo.width / cellWin, photo.height / cellHin) / selectedCell.zoom);
    let tone = "text-emerald-400", verdict = "Eccellente per la stampa";
    if (eff < 150) { tone = "text-red-400"; verdict = "Bassa · scegli una foto più grande"; }
    else if (eff < 300) { tone = "text-amber-400"; verdict = "Buona · accettabile"; }
    dpiInfo = { eff, tone, verdict };
  }

  const rotate90 = (dir) => {
    const r = (((selectedCell.rotation || 0) + dir * 90) % 360 + 360) % 360;
    updateCell(selectedIndex, { rotation: r > 180 ? r - 360 : r });
  };

  return (
    <aside className="w-[340px] shrink-0 border-l border-[#2e323d] bg-[#14161c] h-full flex flex-col">
      <Tabs defaultValue="format" className="flex flex-col h-full">
        <div className="px-4 pt-4">
          <TabsList className="w-full grid grid-cols-4 bg-[#1e2028]">
            <TabsTrigger value="format" data-testid="tab-format" className="text-xs">Formato</TabsTrigger>
            <TabsTrigger value="frame" data-testid="tab-frame" className="text-xs">Cornice</TabsTrigger>
            <TabsTrigger value="cell" data-testid="tab-cell" className="text-xs">Cella</TabsTrigger>
            <TabsTrigger value="text" data-testid="tab-text" className="text-xs">Testi</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto cs-scroll p-4">
          {/* FORMATO */}
          <TabsContent value="format" className="mt-0 space-y-6">
            <Section label="Formato di stampa">
              <Select value={formatId} onValueChange={setFormatId}>
                <SelectTrigger data-testid="format-selector-dropdown" className="bg-[#1e2028] border-[#2e323d] text-gray-100"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectGroup key={g}>
                      <SelectLabel className="text-gray-400">{g}</SelectLabel>
                      {FORMATS.filter((f) => f.group === g).map((f) => (<SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>))}
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
                    <button key={o.id} data-testid={o.tid} disabled={disabled} onClick={() => setOrientation(o.id)}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-lg border transition-colors ${active ? "border-[#e2b15d] bg-[#e2b15d]/10 text-[#e2b15d]" : "border-[#2e323d] text-gray-400 hover:bg-[#23262f] hover:text-gray-200"} disabled:opacity-30 disabled:cursor-not-allowed`}>
                      <o.icon className="w-5 h-5" /><span className="text-[10px]">{o.label}</span>
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section label="Disposizione foto">
              <div className="grid grid-cols-2 gap-2">
                {LAYOUTS.map((l) => (
                  <button key={l.key} data-testid={MANDATED[l.key] || `layout-${l.key}`} onClick={() => setLayoutKey(l.key)}
                    className={`text-left px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors ${layoutKey === l.key ? "border-[#e2b15d] bg-[#e2b15d]/10 text-[#e2b15d]" : "border-[#2e323d] text-gray-300 hover:bg-[#23262f]"}`}>
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
                <Switch data-testid="frame-toggle" checked={frame.enabled} onCheckedChange={(v) => setFrame({ ...frame, enabled: v })} />
              </div>
              <div className="flex justify-between pt-1">
                {FRAME_COLORS.map((c) => (
                  <Swatch key={c.id} testid={`frame-color-${c.id}`} label={c.label} color={c.color} active={frame.color === c.color}
                    onClick={() => setFrame({ ...frame, enabled: true, color: c.color })} />
                ))}
              </div>
              <LabeledSlider label="Spessore cornice" display={frame.width_cm.toFixed(1)} unit=" cm"
                value={[frame.width_cm]} min={0.5} max={6} step={0.5} onValueChange={([v]) => setFrame({ ...frame, width_cm: v })} />
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-sm text-gray-300">Vetro anti-riflesso</p>
                  <p className="text-[10px] text-gray-500">Solo anteprima, non stampato</p>
                </div>
                <Switch data-testid="glass-toggle" checked={glass} onCheckedChange={setGlass} />
              </div>
            </Section>

            <Section label="Passe-partout">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Attiva passe-partout</span>
                <Switch data-testid="passepartout-toggle" checked={mat.enabled} onCheckedChange={(v) => setMat({ ...mat, enabled: v })} />
              </div>
              <div className="flex gap-4 pt-1">
                {MAT_COLORS.map((c) => (
                  <Swatch key={c.id} testid={`mat-color-${c.id}`} label={c.label} color={c.color} active={mat.color === c.color}
                    onClick={() => setMat({ ...mat, enabled: true, color: c.color })} />
                ))}
              </div>
              <LabeledSlider label="Margine passe-partout" display={mat.width_cm.toFixed(1)} unit=" cm"
                value={[mat.width_cm]} min={0} max={8} step={0.5} onValueChange={([v]) => setMat({ ...mat, width_cm: v })} />
            </Section>

            <Section label="Griglia">
              <LabeledSlider label="Spaziatura tra foto" display={gapCm.toFixed(1)} unit=" cm" value={[gapCm]} min={0} max={2} step={0.1} onValueChange={([v]) => setGapCm(v)} />
              <LabeledSlider label="Angoli arrotondati" display={cornerRadiusCm.toFixed(1)} unit=" cm" value={[cornerRadiusCm]} min={0} max={2} step={0.1} onValueChange={([v]) => setCornerRadiusCm(v)} />
              <div className="flex gap-3 pt-1">
                {["#FFFFFF", "#000000", "#F8F5EE"].map((c) => (<Swatch key={c} testid={`bg-color-${c}`} label="Sfondo" color={c} active={bg === c} onClick={() => setBg(c)} />))}
              </div>
            </Section>

            <Button data-testid="find-frames-button" onClick={onOpenFrameFinder}
              className="w-full bg-[#e2b15d] text-[#101216] hover:bg-[#f0c473] font-semibold">
              <ShoppingBag className="w-4 h-4 mr-2" /> Trova cornici da comprare
            </Button>
          </TabsContent>

          {/* CELLA */}
          <TabsContent value="cell" className="mt-0 space-y-6">
            {!selectedCell ? (
              <div className="text-center text-gray-500 text-sm mt-10 px-4">Seleziona una cella sul collage per regolare foto, zoom, rotazione e filtri.</div>
            ) : (
              <>
                <Section label={`Cella ${selectedIndex + 1}`}>
                  {photo ? (
                    <div className="flex items-center gap-3">
                      <img src={photoUrl(photo.id)} alt="" className="w-14 h-14 rounded-lg object-cover border border-[#2e323d]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-300 truncate">{photo.original_filename}</p>
                        {dpiInfo && (<p className={`text-[11px] font-mono ${dpiInfo.tone}`}>~{dpiInfo.eff} DPI · {dpiInfo.verdict}</p>)}
                      </div>
                      <button data-testid="remove-cell-photo" onClick={() => clearCell(selectedIndex)} className="p-2 rounded-lg border border-[#2e323d] text-gray-400 hover:text-red-400 hover:border-red-400/50"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (<p className="text-sm text-gray-500">Nessuna foto. Clicca una miniatura a sinistra o trascinala qui.</p>)}
                </Section>

                {photo && (
                  <>
                    <Section label="Zoom e ritaglio">
                      <div className="flex items-center gap-3">
                        <Slider className="flex-1" value={[selectedCell.zoom]} min={1} max={5} step={0.05} onValueChange={([v]) => updateCell(selectedIndex, { zoom: v })} />
                        <span className="text-xs font-mono text-gray-400 w-10 text-right">{selectedCell.zoom.toFixed(2)}×</span>
                        <button data-testid="reset-cell-button" onClick={() => updateCell(selectedIndex, { zoom: 1, offsetX: 0, offsetY: 0, rotation: 0 })} className="p-2 rounded-lg border border-[#2e323d] text-gray-400 hover:text-[#e2b15d]"><RotateCcw className="w-4 h-4" /></button>
                      </div>
                      <p className="text-[11px] text-gray-500">Trascina la foto nella cella per ritagliare la parte da mostrare.</p>
                    </Section>

                    <Section label="Rotazione">
                      <div className="flex items-center gap-2 mb-1">
                        <button data-testid="rotate-left-90" onClick={() => rotate90(-1)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[#2e323d] text-gray-300 hover:bg-[#23262f] text-xs"><RotateCcw className="w-3.5 h-3.5" /> 90° sx</button>
                        <button data-testid="rotate-right-90" onClick={() => rotate90(1)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[#2e323d] text-gray-300 hover:bg-[#23262f] text-xs"><RotateCw className="w-3.5 h-3.5" /> 90° dx</button>
                      </div>
                      <LabeledSlider label="Angolo preciso" display={Math.round(selectedCell.rotation)} unit="°" value={[selectedCell.rotation]} min={-180} max={180} step={1} onValueChange={([v]) => updateCell(selectedIndex, { rotation: v })} />
                      <p className="text-[11px] text-gray-500">Ruotando aumenta lo zoom per riempire la cella.</p>
                    </Section>

                    <Section label="Filtro colore">
                      <div className="grid grid-cols-2 gap-2">
                        {FILTERS.map((f) => (
                          <button key={f.id} data-testid={`filter-${f.id}`} onClick={() => updateCell(selectedIndex, { filter: f.id })}
                            className={`px-3 py-2 rounded-lg border text-xs transition-colors ${selectedCell.filter === f.id ? "border-[#e2b15d] bg-[#e2b15d]/10 text-[#e2b15d]" : "border-[#2e323d] text-gray-300 hover:bg-[#23262f]"}`}>{f.label}</button>
                        ))}
                      </div>
                    </Section>
                  </>
                )}
              </>
            )}
          </TabsContent>

          {/* TESTI */}
          <TabsContent value="text" className="mt-0 space-y-6">
            <Section label="Aggiungi testo">
              <div className="grid grid-cols-1 gap-2">
                <Button data-testid="add-title-button" onClick={addTitleBottom} variant="outline" className="justify-start border-[#2e323d] bg-transparent text-gray-200 hover:bg-[#23262f] hover:text-white">
                  <Heading className="w-4 h-4 mr-2" /> Titolo in basso
                </Button>
                <Button data-testid="add-caption-button" onClick={addCaptionForCell} disabled={selectedIndex < 0} variant="outline" className="justify-start border-[#2e323d] bg-transparent text-gray-200 hover:bg-[#23262f] hover:text-white disabled:opacity-40">
                  <MessageSquare className="w-4 h-4 mr-2" /> Didascalia foto {selectedIndex >= 0 ? `(cella ${selectedIndex + 1})` : ""}
                </Button>
                <Button data-testid="add-free-text-button" onClick={addFreeText} variant="outline" className="justify-start border-[#2e323d] bg-transparent text-gray-200 hover:bg-[#23262f] hover:text-white">
                  <Type className="w-4 h-4 mr-2" /> Testo libero
                </Button>
              </div>
            </Section>

            {selectedText ? (
              <Section label="Modifica testo">
                <Input data-testid="text-content-input" value={selectedText.content} onChange={(e) => updateText(selectedText.id, { content: e.target.value })}
                  className="bg-[#1e2028] border-[#2e323d] text-gray-100" placeholder="Scrivi qui..." />

                <div className="pt-1">
                  <p className="text-[11px] text-gray-400 mb-1.5">Carattere</p>
                  <div className="grid grid-cols-2 gap-2">
                    {FONTS.map((f) => (
                      <button key={f.id} data-testid={`text-font-${f.id}`} onClick={() => updateText(selectedText.id, { font: f.id })}
                        style={{ fontFamily: f.css }}
                        className={`px-2 py-2 rounded-lg border text-sm transition-colors ${selectedText.font === f.id ? "border-[#e2b15d] bg-[#e2b15d]/10 text-[#e2b15d]" : "border-[#2e323d] text-gray-200 hover:bg-[#23262f]"}`}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <LabeledSlider label="Dimensione" display={selectedText.size_cm.toFixed(1)} unit=" cm" value={[selectedText.size_cm]} min={0.4} max={8} step={0.1} onValueChange={([v]) => updateText(selectedText.id, { size_cm: v })} />
                <LabeledSlider label="Spaziatura lettere" display={selectedText.letter_spacing.toFixed(2)} unit="em" value={[selectedText.letter_spacing]} min={0} max={0.4} step={0.01} onValueChange={([v]) => updateText(selectedText.id, { letter_spacing: v })} />
                <LabeledSlider label="Rotazione" display={Math.round(selectedText.rotation)} unit="°" value={[selectedText.rotation]} min={-90} max={90} step={1} onValueChange={([v]) => updateText(selectedText.id, { rotation: v })} />

                <div className="pt-1">
                  <p className="text-[11px] text-gray-400 mb-1.5">Colore</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {TEXT_COLORS.map((c) => (
                      <button key={c} data-testid={`text-color-${c}`} onClick={() => updateText(selectedText.id, { color: c })}
                        className="w-7 h-7 rounded-full border-2" style={{ background: c, borderColor: selectedText.color === c ? "#e2b15d" : "#3a3f4c" }} />
                    ))}
                    <input type="color" data-testid="text-color-custom" value={selectedText.color} onChange={(e) => updateText(selectedText.id, { color: e.target.value })}
                      className="w-7 h-7 rounded-full border border-[#3a3f4c] bg-transparent cursor-pointer" />
                  </div>
                </div>

                <Button data-testid="delete-text-button" onClick={() => removeText(selectedText.id)} variant="outline" className="w-full mt-2 border-red-500/40 bg-transparent text-red-400 hover:bg-red-500/10">
                  <Trash2 className="w-4 h-4 mr-2" /> Elimina testo
                </Button>
              </Section>
            ) : (
              <p className="text-center text-gray-500 text-sm px-4">
                {texts.length ? "Seleziona un testo sul collage per modificarlo." : "Aggiungi un titolo o una didascalia elegante sul passe-partout."}
              </p>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </aside>
  );
}
