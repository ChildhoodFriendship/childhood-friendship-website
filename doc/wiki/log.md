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

## 2026-10-14 — content — nuovi prezzi e script utenti senza password di default

- Landing: "Siti web e landing page" da 400 €, web app da 800 €, app mobile da 1.200 €.
- `create-client-user.ts`: rimossi email/password di default (password solo da `--password` o `CLIENT_PASSWORD`); nuovo script `npm run client:create`.
- Produzione: password di admin e cliente Sissy ruotate (la vecchia password cliente era nel codice).

## 2026-10-14 — feature — notifiche Telegram al team

- Nuovo `apps/api/src/lib/notify.ts`: avvisi sul bot Telegram elitespaceweb (HTML escapato, bottone verso la piattaforma, timeout 3,5 s, mai bloccante).
- Eventi: nuovo lead dal form del sito, messaggio scritto da un cliente, documento approvato o con modifiche richieste dal cliente.
- Config opzionale `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID` (impostate su Vercel produzione); no-op in test o se mancano.
- Verifica: `npm run check`, `npm run test` (32/32, +3 test notify).

## 2026-10-14 — feature — CRM unico e materiali del cliente

- Migrazione `0001_crm_materiali`: `leads` con email/messaggio facoltativi e campi di prospezione (place_id univoco, score, categoria, indirizzo, sito, scheda Google, messaggio di contatto, link WhatsApp) ed esito (prezzo in centesimi, servizio offerto, contattato/chiuso il); nuova tabella `project_files`.
- API `/api/integrations/leads*` per n8n con token Bearer `LEADS_INGEST_TOKEN` (fuori da sessione e CSRF): place-ids, inserimento deduplicato, stato dal bot, statistiche.
- Pagina admin Lead = CRM unico: filtri per origine/stato, ricerca, score, WhatsApp e scheda Google, progetto chiuso, prezzo fatto, servizio offerto.
- Materiali: caricamento diretto dal browser su Vercel Blob (store `cf-materiali`, fra1) con token monouso limitato a `projects/<id>/`, registrazione verificata con `head`, max 25 MB, tipi ammessi in `lib/storage.ts`. Il cliente elimina solo i propri file; il team tutti. Notifica Telegram quando carica il cliente.
- Nuova dipendenza autorizzata: `@vercel/blob` (api + web). File pubblici con percorso non indovinabile, elencati solo a chi accede al progetto.
- Verifica: `npm run check`, `npm run test` (38/38, +6 test CRM/materiali).

## Decisioni architetturali mantenute

- Monorepo unico npm: `apps/web` Angular, `apps/api` Express/Drizzle, `packages/shared`.
- Admin e portale restano route lazy della stessa app web.
- Postgres relazionale e validazione/tipi condivisi sono preferiti a storage documentale o app separate.
- Inviti, RBAC, credenziali cifrate, audit e migrazioni versionate sono vincoli di sicurezza.
