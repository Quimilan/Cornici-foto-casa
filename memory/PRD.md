# PRD — Collage Studio (Editor collage foto per stampa alta qualità)

## Problem Statement (originale)
"Vorrei creare un'applicazione che mi permette di creare collage di foto di altissima qualità per poterle poi stampare in centri stampa. Idea ispirata a ifolor.it: più formati con la possibilità di inserire più o meno foto a scelta."

## User Choices
- Foto originali caricate e salvate ad alta risoluzione (Object Storage).
- Output finale: file ad altissima risoluzione (JPG/PDF/PNG) scaricabile per la stamperia.
- Formati tipo ifolor (30x40, 50x70, ecc.) verticale/orizzontale + formati quadrati/social.
- Nessun login (uso singolo per ora).
- Design a scelta dell'agente, "armonioso".

## Architettura
- Frontend: React (CRA/craco), Tailwind, shadcn/ui, editor a 3 pannelli. Lingua italiana.
- Backend: FastAPI, MongoDB (progetti + riferimenti foto), Emergent Object Storage per le foto.
- Rendering stampa: lato server con Pillow a 150/300 DPI; le celle usano lo stesso modello cover+zoom+offset del preview (background-image) per corrispondenza 1:1.

## Persona
- Utente singolo/professionista che prepara collage da portare in tipografia.

## Core Requirements (statici)
- Selezione formato + orientamento, template layout (1..12 foto).
- Upload foto alta risoluzione + libreria di esempio, indicatore qualità DPI per cella.
- Editor celle: assegna/trascina foto, pan (drag), zoom (rotellina/slider), filtri (B&N, seppia, vivido, caldo, freddo).
- Cornice (nero/bianco/legno/alluminio, spessore) + passe-partout (colore, margine), spaziatura, angoli, sfondo.
- Salvataggio/apertura progetti.
- Export JPG/PDF/PNG pronti stampa + scheda specifiche per centro stampa.
- Vista Parete soggiorno (mockup).

## Implementato (2026-06)
- [x] Backend: /api/upload, /api/photos, /api/file/{id} (con cache + Cache-Control), /api/import-samples (idempotente), /api/projects CRUD, /api/export (Pillow, JPG/PDF/PNG, DPI verificato).
- [x] Frontend: Studio editor completo (Header, PhotoSidebar, CanvasStage, SettingsPanel, WallPreview, PrintSpec).
- [x] Test end-to-end: 100% backend, 100% frontend (iteration_1).
- [x] Iterazione 2 (100% backend+frontend, iteration_2):
  - Rotazione + ritaglio per cella (slider angolo preciso + step 90°, pan/zoom = ritaglio). Backend ruota con expand e ricalcola il cover.
  - Testi e didascalie sul passe-partout: titolo in basso, didascalia per cella, testo libero trascinabile; font eleganti (Playfair/Cormorant/Montserrat/Corsivo/Inter), dimensione/colore/spaziatura/rotazione. Rendering server-side con TTF bundlati (parità col preview).
  - Disposizione automatica in un clic (sceglie il layout migliore per numero di foto e riempie).
  - Cornici premium (legno/alluminio con gradiente, bevel) + vetro anti-riflesso SOLO in anteprima (non stampato) + "Trova cornici" con link di ricerca live a negozi reali (Amazon.it, IKEA, ifolor, Leroy Merlin, Etsy, Google Shopping).
- [x] Iterazione 3 (100% backend+frontend, iteration_3): Export PDF professionale pronto stampa.
  - Dialogo dedicato con scelta formato carta (A5/A4/A3/A2/30x40/50x70/70x100 o "Come il collage") + orientamento.
  - 300 DPI, colori CMYK (Pillow convert), margini al vivo (bleed) 3mm su tutti i lati con edge-extension.
  - Riepilogo live: pagina rifilata, dimensione con bleed, pixel finali, modalità colore.
- [x] Iterazione 4 (100% backend+frontend, iteration_4): Rifiniture PDF tipografia.
  - Crocini di taglio (crop marks) a L nei 4 angoli, esterni al bleed, in margine bianco dedicato.
  - Profilo colore CMYK professionale FOGRA39 (Coated_Fogra39L, ICC in /app/backend/profiles) applicato via ImageCms; toggle attivabile nel dialogo export.
- [x] Iterazione 5 (100% backend+frontend, iteration_5): Configuratore galleria + forma foto.
  - Numero riquadri 1–50 (slider + input), disposizione "Griglia regolare" o "Layout misti" con anteprime, spessore bordo tra i riquadri fino a 3cm. Motore layout: gridCells/gridVariants/mixedVariants/computeVariants.
  - Forma per singola foto (cella): Riempi, Quadrato 1:1, 4:3, 3:2, 3:4, 2:3 — la foto viene mostrata nel rapporto scelto, centrata nel riquadro, con sfondo attorno. Reso identico in preview ed export (render_cell inner box).
- [x] Iterazione 6 (100% backend+frontend, iteration_6): Forma globale + packing intelligente.
  - "Forma delle foto" globale (Riempi / Quadrato / rettangolari orizz. e vert.). Scegliendo una forma, l'app calcola il numero massimo di foto di quella forma che entrano nella cornice (in base all'area utile) e imposta quel massimo sul selettore riquadri.
  - Griglie ottimali suggerite (es. 2×3, 3×3, 4×4) calcolate dal rapporto della cornice; un clic le applica con celle della forma scelta.
  - Pulsante "Applica questa forma a tutti i riquadri" nella tab Cella. Utility: shapeTarget/shapeColsFor/suggestedGrids/maxShapesIn.

## Backlog / Prossimi passi (P1/P2)
- Auto-disposizione intelligente / suggerimento layout in base al numero di foto caricate.
- Rotazione e ritaglio avanzato per cella.
- Preset cornici professionali e simulazione vetro anti-riflesso.
- Ordine diretto / invio al centro stampa (con pagamento) — non richiesto ora.
- LRU/TTL sulle cache in-process (nota code review, non bloccante).
