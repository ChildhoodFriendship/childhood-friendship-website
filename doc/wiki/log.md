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

## 2026-10-14 — security — pulizia repo, hardening e zero trust

- Rimossi: modulo appuntamenti (API, schema, DTO, UI; migrazione `0002_rimuovi_appuntamenti.sql`), "Attività recenti" in dashboard, `docs/wiki_example`, `IDEA.md`.
- Anti-SSRF: `lib/safe-url.ts` (solo http/https su porte standard, niente credenziali, DNS verificato contro reti private/link-local/metadata); health-check progetto senza redirect automatici e con timeout.
- API: body JSON limitato a 1 MB.
- `vercel.json`: Content-Security-Policy (script solo `'self'`, Blob consentito per immagini/upload), COOP/CORP, HSTS preload; `inlineCritical: false` per compatibilità CSP, sourcemap disattivate in produzione.
- Dipendenze: `npm audit` 0 vulnerabilità (override esbuild nel ramo drizzle-kit); CI con `npm audit --omit=dev` e CLI Vercel con versione fissata.
- Database produzione: l'app usa il ruolo `cf_app` (solo DML, nessun DDL, nessun accesso ad altri DB); l'owner serve solo per le migrazioni (secret CI). Rimosso `SISSY_DATABASE_URL` da Vercel.
- Da fare a mano: ruotare la password di `neondb_owner` (comparsa nella storia git) e aggiornare il secret `DATABASE_URL` di GitHub.
- Verifica 2026-10-14: `npm run check`, `npm run test` (39/39, +2 test anti-SSRF) e `npm run build` passati.

## 2026-10-15 — feature — dashboard admin con grafici; CI di deploy funzionante

- `/api/dashboard`: lead per stato, lead per settimana (sito/prospezione, 12 settimane), chiuso per mese (6 mesi, da `closedAt` + `priceCents`), valore pipeline, task completati (8 settimane).
- Web: KPI (pipeline, chiuso, conversione = convertiti / (convertiti + persi)), istogrammi SVG senza librerie (`shared/bar-chart.component.ts`, tooltip, tabella per screen reader, stato vuoto), funnel lead cliccabile (`/admin/lead?stato=`).
- Palette grafici validata sul fondo scuro: viola `#8B5CF6` (sito) + ambra `#D97706` (prospezione).
- CI: migrazioni con solo `DATABASE_URL` (rimossi `JWT_SECRET`/`CREDENTIALS_KEY` dai secret GitHub), timeout 15 minuti per job, `VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` aggiornati: push su `main` = migrazioni + deploy.
- Ruotati i segreti dello store Neon (password `neondb_owner`); l'app usa `cf_app`, non toccato. Migrazione `0002` applicata in produzione.
- Verifica: `npm run check`, `npm run test` (40/40), CI verde.

## 2026-10-15 — feature — preventivo progetto, email, rate limit condiviso, e2e

- Progetti: campo `type` (sito/landing, web app, app mobile, manutenzione, altro) e `quote_items` (voci con prezzo, canone mensile) — migrazione `0004`; card «Tipo e preventivo» nei dettagli con prezzo base dal listino e voci suggerite. Il preventivo è nascosto al cliente (`PORTAL_HIDDEN_PROJECT_FIELDS`).
- Bug corretto: gli schemi PATCH (progetto, task, piattaforme, contenuti, campagne) applicavano i default, quindi un aggiornamento parziale riscriveva stato/online/marketing/task completati. Ora `patchOf()` toglie i default; test di regressione.
- Rate limit di login, refresh e form pubblico su Postgres (`rate_limits`, migrazione `0003` con grant a `cf_app`): vale su tutte le istanze serverless. Il limite globale resta in memoria.
- Email via Resend (`RESEND_API_KEY`, `MAIL_FROM`): invito, messaggio del team al cliente, documento da approvare. Senza chiave sono disattivate e l'invito mostra solo il link.
- Test end-to-end Playwright (`e2e/`, `npm run e2e`): server con PGlite in memoria + build web; login, dashboard e funnel, Lead, preventivo. In locale: `E2E_CHANNEL=chrome npm run e2e`.
- CI: `actions/checkout`/`setup-node`/`upload-artifact` v7, runner `ubuntu-24.04` fissato, e2e nel job di verifica.
- Branch `feature/3d-vault-hero` e `hermes/wiki-migration` obsoleti: archiviati come tag `archive/*` ed eliminati.
- Verifica: `npm run check`, `npm run test` (47/47), `npm run e2e` (4/4).

## 2026-10-15 — security — GDPR: informativa, cookie, minimizzazione e conservazione

- Pagine `/privacy` e `/cookie` (`apps/web/src/app/legal/`): titolari «Lorenzo e Mirko», contatto `lorenzo@cfofficial.it`, Padova. Link nel footer; nessuna P.IVA indicata. Testi da far validare a un professionista.
- Form contatti: presa visione dell'informativa (base 6.1.b) con link; il lead salva `privacy_version` e `privacy_accepted_at` (migrazione `0006`).
- Minimizzazione: tolto l'hash IP dai lead (migrazione `0005`, azzerati anche i vecchi SHA-256 nel registro attività); IP del registro e chiavi del rate limit solo come HMAC con chiave segreta (`lib/privacy.ts`); le notifiche Telegram non contengono più messaggi, commenti o recapiti.
- Font ospitati in locale (@fontsource): nessuna richiesta a Google, CSP senza domini esterni. Solo cookie tecnici (cf_at, cf_rt, XSRF-TOKEN): nessun banner necessario.
- Conservazione automatica (`modules/retention`): cron Vercel giornaliero su `/api/internal/retention` con `CRON_SECRET` (impostato in produzione). Lead dal sito 24 mesi, prospezione 12 mesi, sessioni 30 giorni, inviti 90 giorni, registro 24 mesi; i clienti non vengono mai cancellati.
- Verifica: `npm run check`, `npm run test` (52/52), `npm run e2e` (6/6, incluso «nessuna richiesta esterna dalla landing»).
- Da valutare: database Neon in us-east-1 (USA). Per ridurre i trasferimenti extra UE conviene spostarlo in una regione UE (es. Francoforte).
