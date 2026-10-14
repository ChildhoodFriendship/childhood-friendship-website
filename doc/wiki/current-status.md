# Stato corrente

> Snapshot documentale: 2026-10-14 · branch osservato: `fix/portale-privacy`.

## Sistema

- Monorepo npm workspaces: `apps/web`, `apps/api`, `packages/shared`.
- Web Angular 22 con landing pubblica, area admin e portale clienti.
- API Express + Drizzle; PGlite in locale, Postgres/Neon previsto in produzione.
- Auth a sessione con access/refresh token, inviti, ruoli `admin`/`staff`/`client`, CSRF e audit.
- Portale cliente: dati interni di progetto, assegnatari, task di documenti interni e note appuntamenti non esposti (DTO `Portal*`).
- Listino in landing: siti web e landing page da 400 €, web app da 800 €, app mobile da 1.200 €, cura da 20 €/mese.
- Landing con scena Three.js caricata in differita, portfolio 3D, contatti e route `/caveau`.

## Verifiche riconfermate

| Controllo | Esito registrato |
|---|---|
| `npm run check` | passato per shared, API e web il 2026-10-14 |
| `npm run test` | 32/32 test API passati il 2026-10-14 |
| `npm run build` | passato web + API il 2026-10-14; scena 3D e feature restano lazy |
| Smoke test Chromium | passato nello snapshot precedente; non rieseguito in questa migrazione |

Il smoke test browser resta un'evidenza precedente; la migrazione documentale non modifica il runtime.

## Milestone

- Bootstrap, landing, piattaforma monorepo, API, admin/portale e lead: completati.
- Primo deploy Vercel + Neon: completato (produzione `childhood-friendship-website-pi.vercel.app`, deploy automatico da `refactor/platform`, DB Neon verificato il 2026-10-14).
- Notifiche Telegram al team (lead sito, messaggi e revisioni del cliente): completate.
- Notifiche email transazionali: da pianificare.
- Tariffe, abbonamenti e cashflow: esclusi dalla v1.

## Punti aperti e limiti

- Inviti senza email transazionale: i link vengono copiati e inviati manualmente.
- CSP del sito statico non ancora impostata; rate limit in memoria per istanza.
- Test automatici frontend non presenti; la copertura UI è affidata a smoke test/Playwright.
- Fluidità in browser reale e alcuni layout mobile della landing 3D da verificare.
- Portfolio con card/mock grafici dove mancano screenshot reali.
- La configurazione del provider contatti/AI e i servizi esterni richiedono verifica nell'ambiente target.

## Dipendenze critiche

Node.js ≥22; Angular CLI/toolchain; npm workspaces; Drizzle; PGlite locale; Postgres/Neon, Vercel e provider AI in produzione. I segreti di runtime sono richiesti ma non documentati con valori.
