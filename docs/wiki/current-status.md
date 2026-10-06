---
title: Stato corrente — Childhood Friendship
created: 2026-10-06
updated: 2026-10-06
type: status
tags: [status, milestone, project, testing]
project: childhood-friendship-website
status: active
confidence: medium
sources: [package.json, apps/web/src/app/app.routes.ts, apps/api/src/app.ts, apps/api/src/db/schema.ts]
---

# Stato corrente

> Snapshot: 2026-10-06 · branch di lavoro: `hermes/wiki-migration`.

## Repository

| Elemento | Valore osservato |
|---|---|
| Workspace | npm workspaces: `apps/web`, `apps/api`, `packages/shared` |
| Web | Angular 22, standalone, route lazy, `@angular/build` |
| API | Express 5, Drizzle ORM, PostgreSQL/PGlite, Vitest/Supertest |
| Runtime locale | Node.js ≥22; API :3000, web :4200 con proxy `/api` |
| Test automatici | 3 file, 26 test API |
| Localizzazione | UI e messaggi applicativi in italiano |

## Verifica riconfermata

| Controllo | Risultato |
|---|---|
| `npm run check` | Passato per shared, API e web |
| `npm run test` | Passato: 26/26 test |
| `npm run build` | Passato: web e API; feature web prodotte anche come lazy chunk |
| `git diff --check` | Passato sullo stato precedente alla migrazione |
| Smoke test browser | Esito positivo nello snapshot precedente; non rieseguito per questa modifica documentale |

## Milestone

- Landing pubblica, monorepo, API, autenticazione, area admin, portale cliente e lead: implementati nel codice.
- Gestione documenti con versioning, revisione e approvazione: implementata nel codice.
- Marketing e moduli AI: presenti nell'API e nell'area admin.
- Primo deploy Vercel/Neon e verifica nell'ambiente target: da riconfermare.
- Notifiche email transazionali: non documentate come implementate; gap aperto.

## Gap e limiti

- Il deploy di produzione non è verificato in questa wiki.
- I servizi esterni, i provider AI, browser reali, responsive e accessibilità richiedono prove dedicate.
- Il rate limit è in memoria per istanza.
- Non risultano test automatici frontend dedicati.
- La fluidità e alcuni layout mobile della scena 3D richiedono verifica browser reale.
- Gli screenshot reali del portfolio e i dati commerciali devono restare aggiornabili senza inventare contenuti.
- `npm ci` ha segnalato 4 vulnerabilità moderate; non sono state applicate correzioni automatiche.

## Attività aperte

1. Verificare deploy e smoke test in Vercel/Neon.
2. Decidere e implementare notifiche email solo con requisiti confermati.
3. Aggiungere test frontend o una strategia E2E mantenibile.
4. Ripetere QA browser desktop/mobile della landing 3D.
5. Valutare CSP e rate limiting persistente prima di aumentare il traffico.
