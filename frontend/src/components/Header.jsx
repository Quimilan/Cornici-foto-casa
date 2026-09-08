import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Frame, Save, FolderOpen, Eye, FileText, Download, Loader2, ChevronDown, Trash2 } from "lucide-react";

export default function Header({
  projectName, setProjectName, dpi, setDpi,
  onSave, onOpenLoad, onWallPreview, onPrintSpec, onExport, onOpenPdfExport, exporting,
  projects, onLoadProject, onDeleteProject,
}) {
  return (
    <header
      data-testid="app-header"
      className="h-14 shrink-0 border-b border-[#2e323d] bg-[#0d0e11] flex items-center px-4 gap-3"
    >
      <div className="flex items-center gap-2.5 pr-3">
        <div className="w-8 h-8 rounded-lg bg-[#e2b15d] flex items-center justify-center">
          <Frame className="w-4 h-4 text-[#101216]" />
        </div>
        <div className="leading-tight">
          <p className="font-display font-bold text-[15px] text-white">Collage Studio</p>
          <p className="text-[10px] text-gray-500 -mt-0.5">Stampa alta qualità</p>
        </div>
      </div>

      <div className="w-px h-6 bg-[#2e323d]" />

      <Input
        data-testid="project-name-input"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        className="w-56 h-9 bg-[#1e2028] border-[#2e323d] text-gray-100 text-sm"
        placeholder="Nome progetto"
      />

      <div className="flex-1" />

      <Button data-testid="wall-preview-modal-button" onClick={onWallPreview} variant="ghost"
        className="text-gray-300 hover:text-white hover:bg-[#1e2028]">
        <Eye className="w-4 h-4 mr-2" /> Vista Parete
      </Button>
      <Button data-testid="print-specifications-sheet-button" onClick={onPrintSpec} variant="ghost"
        className="text-gray-300 hover:text-white hover:bg-[#1e2028]">
        <FileText className="w-4 h-4 mr-2" /> Specifiche
      </Button>

      <div className="w-px h-6 bg-[#2e323d]" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button data-testid="load-project-button" variant="outline"
            className="border-[#2e323d] bg-transparent text-gray-200 hover:bg-[#1e2028] hover:text-white">
            <FolderOpen className="w-4 h-4 mr-2" /> Apri
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-[#1e2028] border-[#2e323d] text-gray-200 w-64">
          <DropdownMenuLabel className="text-gray-400">Progetti salvati</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-[#2e323d]" />
          {projects.length === 0 ? (
            <div className="px-2 py-3 text-xs text-gray-500">Nessun progetto salvato</div>
          ) : (
            projects.map((p) => (
              <DropdownMenuItem key={p.id} data-testid={`project-item-${p.id}`}
                className="flex items-center justify-between focus:bg-[#23262f] focus:text-white"
                onSelect={() => onLoadProject(p)}>
                <span className="truncate">{p.name}</span>
                <Trash2 className="w-3.5 h-3.5 text-gray-500 hover:text-red-400"
                  onClick={(e) => { e.stopPropagation(); onDeleteProject(p.id); }} />
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button data-testid="save-project-button" onClick={onSave} variant="outline"
        className="border-[#2e323d] bg-transparent text-gray-200 hover:bg-[#1e2028] hover:text-white">
        <Save className="w-4 h-4 mr-2" /> Salva
      </Button>

      <Select value={String(dpi)} onValueChange={(v) => setDpi(Number(v))}>
        <SelectTrigger className="w-24 h-9 bg-[#1e2028] border-[#2e323d] text-gray-100" data-testid="dpi-select">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="150">150 DPI</SelectItem>
          <SelectItem value="300">300 DPI</SelectItem>
        </SelectContent>
      </Select>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button data-testid="export-menu-button" disabled={exporting}
            className="bg-[#e2b15d] text-[#101216] hover:bg-[#f0c473] font-semibold">
            {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Esporta <ChevronDown className="w-4 h-4 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-[#1e2028] border-[#2e323d] text-gray-200">
          <DropdownMenuItem data-testid="export-high-res-jpg-button" onSelect={() => onExport("jpg")}
            className="focus:bg-[#23262f] focus:text-white">JPG alta qualità</DropdownMenuItem>
          <DropdownMenuItem data-testid="export-high-res-pdf-button" onSelect={onOpenPdfExport}
            className="focus:bg-[#23262f] focus:text-white">PDF pronto stampa (CMYK)…</DropdownMenuItem>
          <DropdownMenuItem data-testid="export-high-res-png-button" onSelect={() => onExport("png")}
            className="focus:bg-[#23262f] focus:text-white">PNG senza perdite</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
