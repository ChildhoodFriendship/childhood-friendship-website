---
title: Stato corrente — Childhood Friendship
created: 2026-09-28
updated: 2026-10-05
type: status
tags: [status, milestone, project]
project: childhood-friendship-website
status: active
confidence: high
sources: [package.json, apps/api/test, .github/workflows/deploy.yml]
---

# Stato corrente

> Snapshot: 2026-10-05, branch `refactor/platform`.

## Verifiche eseguite

| Controllo | Esito |
|---|---|
| `npm run check` | Passato (shared, api, web) |
| `npm test` | **26/26** test di integrazione passati |
| `npm run build` | Passato. Initial web ~367 kB (104 kB gzip); landing 38 kB; scena 3D 692 kB caricata in differita solo su desktop |
| Migrazioni | Applicate da zero su PGlite (sorgente e bundle) |
| Smoke test browser (Chromium) | Passato: form contatti → lead, login admin, creazione progetto con template, checklist, editor documento + versione, invio al cliente, credenziali cifrate + rivelazione, messaggi, marketing, vista mobile, login cliente, blocco /admin per il cliente, approvazione documento, registro attività |

## Landing 3D (2026-10-05)

- Build di produzione passata; type-check pulito.
- Fasi verificate in headless a fotogrammi fermi: hero, zoom laptop→manifesto (confronto pixel), metodo con socio, portfolio, finale (batti cinque, particelle, logo), quiz contatti (flusso completo con payload verificato).
- Dettagli: [[modules/landing-3d.md|landing 3D]].

## Gap aperti

- Primo deploy Vercel/Neon da eseguire ([[runbooks/deploy-production.md|runbook]]).
- Nessuna email transazionale: i link d'invito vanno copiati e inviati a mano.
- CSP non ancora impostata sul sito statico (gli altri header di sicurezza sì).
- Rate limit in memoria per istanza.
- Test automatici del frontend non presenti (coperto da smoke test manuale/Playwright).
- Landing: fluidità in browser reale e layout mobile del metodo/portfolio/finale da verificare; card portfolio con mock grafici al posto di screenshot reali; Node di Windows 22.14 troppo vecchio per Angular CLI (si usa node@24 via npx).

Pagine correlate: [[milestones.md|milestone]], [[architecture/system-architecture.md|architettura]].
