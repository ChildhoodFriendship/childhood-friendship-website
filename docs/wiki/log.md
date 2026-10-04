# Log della wiki del progetto

> Append-only. Formato: `## [YYYY-MM-DD] action | subject`  
> Azioni: create, update, verify, archive, lint, query.

## [2026-09-28] create | Wiki del progetto corrente
- Analizzato il modello documentale di riferimento senza trasferirne contenuti specifici.
- Ricostruita la struttura della wiki per `childhood-friendship-website`.

## [2026-09-28] create | Pagine iniziali
- Create pagine di progetto, architettura, moduli, catalogo componenti, runbook, stato, guida agenti e uso del contesto.
- Aggiunte le pagine all'indice con riferimenti relativi al repository.

## [2026-09-28] verify | Snapshot del progetto
- `npm run build`: passato; bundle iniziali e chunk lazy generati.
- `npm run test`: bloccato dagli argomenti `--watch` e `--browsers` rifiutati dal builder corrente.
- `npm run lint`: bloccato dall'assenza del target `lint` in `angular.json`.
- `git diff --check`: passato.

## [2026-09-28] update | Regole operative agenti
- Trasferite e adattate le regole di orientamento, gerarchia delle fonti, modifica minima, verifica, handoff e manutenzione wiki.
- Integrate anche le regole su commit/push, access modifier, formattazione, commenti, naming degli endpoint e gestione futura dei flussi settings/realtime.
- `Agents.md` resta da sincronizzare perché la scrittura del file protetto richiede un'approvazione del sistema non ricevuta.

## [2026-10-03] update | Piattaforma v0.2 (refactor/platform)
- Monorepo: `apps/web`, `apps/api`, `packages/shared`; consolidati EliteWebAgency (backend) ed elitespaceweb (dominio, AI).
- Nuove dipendenze approvate: API (express, drizzle-orm, pg, zod, jose, helmet, express-rate-limit, cookie-parser; dev: pglite, vitest, supertest, tsx, esbuild, drizzle-kit); web (`@angular/forms`, builder `@angular/build` al posto di `@angular-devkit/build-angular` deprecato).
- Create: milestones, boundaries, best-practices, modules/api-backend, modules/admin-portal, decisions/adr-001, runbooks/deploy-production.
- Aggiornate: architettura, progetto, stato, runbook locale, indice.

## [2026-10-03] verify | Piattaforma v0.2
- `npm run check`, `npm test` (26/26), `npm run build`: passati.
- Smoke test Playwright end-to-end admin + cliente + landing desktop/mobile: passato.

## [2026-10-04] feat | Builder animato + listino
- Builder: rig umanoide generato in codice (`apps/web/scripts/rig-builder.mjs`, 24 ossa), animazioni procedurali in `scene/builder-rig.ts` (respiro, sguardo sul cursore, saluto, laptop, 4 pose del metodo, benvenuto finale, salto al click).
- Listino: righe espandibili con dettagli, switch Sviluppo/Dopo il lancio, font display.
- Hero: Builder centrato nello stage (colonna destra), laptop retto in mano con IK; zoom nello schermo che mostra il manifesto reale (disegnato dal DOM) e passaggio alla sezione senza stacco.
