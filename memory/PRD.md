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

## Backlog / Prossimi passi (P1/P2)
- Auto-disposizione intelligente / suggerimento layout in base al numero di foto caricate.
- Rotazione e ritaglio avanzato per cella.
- Preset cornici professionali e simulazione vetro anti-riflesso.
- Ordine diretto / invio al centro stampa (con pagamento) — non richiesto ora.
- LRU/TTL sulle cache in-process (nota code review, non bloccante).
