---
title: Best practice di sviluppo
created: 2026-10-03
updated: 2026-10-03
type: guidance
tags: [guidance, workflow, testing]
project: childhood-friendship-website
status: active
confidence: high
sources: [apps/api/src, apps/web/src/app, apps/api/test]
---

# Best practice di sviluppo

## API

- Un modulo per dominio in `apps/api/src/modules/<dominio>/` con `*.routes.ts` (ed eventuale `*.service.ts`).
- Input: `parse(schema, req.body)`; errori: lanciare `HttpError` (helper in `lib/http-error.ts`) con messaggi in italiano.
- PATCH: `defined()` per ignorare i campi non inviati, `emptyToNull()` per URL/email opzionali.
- Risposte: `serialize()` per convertire le date; mai restituire `passwordHash`, `tokenHash`, `secretEnc`, `ipHash`.
- Documenti: ogni modifica di contenuto crea una riga in `document_versions` e richiede `baseVersion` (concorrenza ottimistica).
- Ogni nuova rotta → almeno un test in `apps/api/test` che copra anche il caso "cliente non autorizzato".

## Web

- Pagine lazy (`loadComponent`), stato con `signal`/`computed`, `ChangeDetectionStrategy.OnPush`.
- Chiamate HTTP tramite `Api` (Promise + `ApiError` con messaggio pronto); errori all'utente con `ToastService`.
- Conferme con `ConfirmService` (mai `window.confirm`/`alert`).
- Stili condivisi dell'area riservata in `src/styles/app.css` (classi `card`, `btn`, `table`, `field`…); CSS di componente solo per il layout specifico.
- Etichette e colori degli stati in `shared/labels.ts`.

## Verifica prima del commit

`npm run check && npm test && npm run build`

Pagine correlate: [[boundaries.md|confini]], [[runbooks/local-development.md|sviluppo locale]].
