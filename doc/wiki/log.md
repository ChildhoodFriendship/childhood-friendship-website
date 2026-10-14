# Log sintetico

Formato: `## YYYY-MM-DD — tipo — oggetto`. Il log è append-only.

## 2026-10-06 — migration — wiki ottimizzata per Hermes

- Consolidata la documentazione da `docs/wiki/` nella struttura minima `doc/wiki/`.
- Conservati vincoli Angular/API, sicurezza, stato corrente, limiti e decisione del monorepo.
- Eliminati contenuti ridondanti, runbook separati e log obsoleti dalla nuova struttura.
- Verifica 2026-10-06: `npm run check`, `npm run test` (26/26) e `npm run build` passati dopo `npm ci`.
- `git diff --check` passato; `npm ci` ha segnalato 4 vulnerabilità moderate da valutare separatamente.

## 2026-10-14 — security — dati interni nascosti al portale cliente, rimosso modulo Salone

- API: per il ruolo `client` il progetto non espone `stagingUrl`, `repositoryUrl`, `marketingEnabled`, `marketingBudgetCents`, `indexingStatus` (`PORTAL_HIDDEN_PROJECT_FIELDS` in `catalog.ts`, tipo `PortalProjectDto`).
- API: il cliente riceve solo task senza documento o legati a documenti `clientVisible`, senza `assigneeId`; avanzamento calcolato sugli stessi task/documenti.
- API: le `notes` degli appuntamenti restano interne al team (`PortalAppointmentDto`).
- Web: portale tipizzato con i DTO dedicati; rimosso il modulo admin Salone (mock in localStorage, backend già eliminato in `bb16cf8`).
- Verifica 2026-10-14: `npm run check`, `npm run test` (29/29, +3 test RBAC) e `npm run build` passati.

## Decisioni architetturali mantenute

- Monorepo unico npm: `apps/web` Angular, `apps/api` Express/Drizzle, `packages/shared`.
- Admin e portale restano route lazy della stessa app web.
- Postgres relazionale e validazione/tipi condivisi sono preferiti a storage documentale o app separate.
- Inviti, RBAC, credenziali cifrate, audit e migrazioni versionate sono vincoli di sicurezza.
