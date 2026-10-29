# Stato corrente

> Snapshot documentale: 2026-10-29 · branch osservato: `main`.

## Sistema

- Monorepo npm workspaces: `apps/web`, `apps/api`, `packages/shared`.
- Web Angular 22 con landing pubblica, area admin e portale clienti.
- API Express + Drizzle; PGlite in locale, Postgres/Neon previsto in produzione.
- Auth a sessione con access/refresh token, inviti, ruoli `admin`/`staff`/`client`, CSRF e audit.
- Portale cliente: dati interni di progetto, assegnatari e task di documenti interni non esposti (DTO `Portal*`).
- Listino in landing: siti web e landing page da 400 €, web app da 800 €, app mobile da 1.200 €, cura da 20 €/mese.
- Landing con scena Three.js caricata in differita, portfolio 3D, contatti e route `/caveau`.

## Verifiche riconfermate

| Controllo | Esito registrato |
|---|---|
| `npm run check` | passato per shared, API e web il 2026-10-29 |
| `npm run test` | 58/58 test API passati il 2026-10-29 |
| `npm run build` | passato web + API il 2026-10-29; scena 3D e feature restano lazy |
| `npm run e2e` | 6/6 test Playwright passati il 2026-10-15 (anche in CI) |
| Smoke test Chromium | passato nello snapshot precedente; non rieseguito in questa migrazione |

Il smoke test browser resta un'evidenza precedente; la migrazione documentale non modifica il runtime.

## Milestone

- Bootstrap, landing, piattaforma monorepo, API, admin/portale e lead: completati.
- Primo deploy Vercel + Neon: completato (produzione `childhood-friendship-website-pi.vercel.app`, deploy dalla CI su push in `main` (progetto Vercel non collegato a Git), DB Neon verificato il 2026-10-14).
- Notifiche Telegram al team (lead sito, messaggi e revisioni del cliente): completate.
- CRM unico (form sito + prospezione n8n) e materiali del cliente su Vercel Blob: completati.
- Pulizia repo e hardening (CSP, anti-SSRF, ruolo DB `cf_app` a privilegi minimi, appuntamenti rimossi): completati.
- Notifiche email transazionali: da pianificare.
- Tariffe, abbonamenti e cashflow: esclusi dalla v1.

## Punti aperti e limiti

- Fiscale: P.IVA non ancora aperta. Contratto (`contract.routes.ts`, `project-contract.component.ts`), email (`mailer.ts`) e riepilogo nel portale (`quote-receipt.component.ts`) contengono ancora P.IVA, indirizzo e certificato W-8BEN-E non reali e vanno collegati a `@cf/shared/company`; il pagamento Apple Pay del portale è una simulazione (nessun addebito). Vedi `compliance.md`.
- Pagamenti e fatture: tabelle e API in lettura pronte (`0009`); mancano webhook Stripe e integrazione con il provider di fatturazione (dopo la P.IVA).
- Migrazione `0009` da applicare in produzione (CI su push in `main`): crea `contract_signatures`, finora assente in produzione.
- Lead USA già in produzione con nomi e stime del vecchio seed: rieseguire `npm run leads:seed -w @cf/api` contro produzione per ripulire nome, note e messaggio (stato e prezzo restano). I vecchi dati restano nella storia git.

- Privacy: informativa aggiornata (titolare ditta individuale, firma, pagamenti, fatture) ma da far validare; database Neon negli USA: procedura di migrazione in UE in `compliance.md`; DPA dei fornitori da archiviare.

- Email transazionali pronte ma disattivate finché non si configurano `RESEND_API_KEY` e `MAIL_FROM` (dominio verificato).
- Rate limit globale in memoria per istanza; login, refresh e form pubblico condivisi su Postgres.
- Password `neondb_owner` da ruotare: compare nella storia git (repo privato).
- Test e2e Playwright solo sui flussi admin principali; portale cliente non ancora coperto.
- Fluidità in browser reale e alcuni layout mobile della landing 3D da verificare.
- Portfolio con card/mock grafici dove mancano screenshot reali.
- La configurazione del provider contatti/AI e i servizi esterni richiedono verifica nell'ambiente target.

## Dipendenze critiche

Node.js ≥22; Angular CLI/toolchain; npm workspaces; Drizzle; PGlite locale; Postgres/Neon, Vercel e provider AI in produzione. I segreti di runtime sono richiesti ma non documentati con valori.
