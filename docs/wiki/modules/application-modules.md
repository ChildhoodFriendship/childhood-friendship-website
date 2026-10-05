---
title: Moduli applicativi e confini condivisi
created: 2026-09-28
updated: 2026-10-03
type: module
tags: [module, architecture, integration, status]
project: childhood-friendship-website
status: active
confidence: high
sources: [src/app/landing-page, src/app/app.routes.ts, src/environments/environment.ts, src/styles.css]
---

# Moduli applicativi e confini condivisi

## Pattern di caricamento

La route principale usa `loadComponent` per caricare la landing solo quando la route viene risolta. `LandingPageComponent` importa esplicitamente i nove componenti standalone che compongono la pagina.

## Struttura della landing

- **Header:** navigazione e accesso alle sezioni.
- **Hero:** messaggio principale, call to action e showcase Three.js.
- **Trust bar:** elementi di fiducia del brand.
- **Services:** tre offerte: siti web, web app e app mobile.
- **Portfolio:** carosello 3D di progetti reali guidato dallo scroll (sostituisce il listino, rimosso il 2026-10-05). Dettagli in [[modules/landing-3d.md|landing 3D]].
- **About:** identità e posizionamento.
- **Process:** capire, costruire, far crescere.
- **Contact:** form nome/email/messaggio con honeypot.
- **Footer:** chiusura della pagina e link complementari.

## Stato locale e dati tipizzati

| Modulo | Stato/contratto | Fonte |
|---|---|---|
| Hero | Signals per sblocco, progresso, fase, progetto selezionato; tipo `ProjectExhibit` nel componente | `hero-section.component.ts` |
| Services | array readonly di `ServiceCard` | `services-section.component.ts` |
| Process | array readonly di `ProcessStep` | `process-section.component.ts` |
| Portfolio | `Project`; signal `pos`/`flipNow`, `computed` per le trasformazioni 3D; evento `cf:portfolio` | `portfolio/portfolio.component.ts` |
| Contact | union state `idle/submitting/success/error`; endpoint environment | `contact-section.component.ts` |

## Flusso del contatto

1. Il template lega `action` all'environment e ascolta `submit`.
2. `submitContactForm` previene il submit standard e passa a `submitting`.
3. `fetch` invia `FormData` con header `Accept: application/json`.
4. Una risposta non OK viene trattata come errore.
5. Successo: reset del form e stato `success`; errore: stato `error`.

La consegna al servizio esterno richiede verifica browser controllata; non è dimostrata dal sorgente.

## Regole di confine

- Non introdurre stato globale per interazioni limitate a una sezione.
- Mantenere i dati statici readonly e tipizzati.
- Mantenere `OnPush` nei componenti.
- Smaltire correttamente eventuali risorse Three.js quando si modifica l'hero.
- Il form invia a `POST /api/public/leads` (validazione Zod lato server, honeypot `website`, consenso privacy obbligatorio).

Pagine correlate: [[../architecture/system-architecture.md|architettura]], [[component-catalog.md|catalogo componenti]], [[../current-status.md|stato]] e [[../token-usage.md|contesto]].
