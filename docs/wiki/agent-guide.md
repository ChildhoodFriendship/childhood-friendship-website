---
title: Guida operativa per agenti
created: 2026-10-06
updated: 2026-10-06
type: guidance
tags: [guidance, workflow, documentation, security]
project: childhood-friendship-website
status: active
confidence: high
sources: [SCHEMA.md, current-status.md, package.json, apps/web/angular.json, Agents.md]
---

# Guida operativa per agenti

Ogni attività deve essere piccola, sicura, verificabile e riprendibile.

## 1. Orientarsi prima di agire

1. Leggere `SCHEMA.md`, `index.md`, `current-status.md` e le ultime 20–30 righe di `log.md`.
2. Prima di modificare la repo, eseguire `git status`. Se ci sono modifiche locali non committate, fermarsi e comunicarlo.
3. Se lo stato è pulito, eseguire `git fetch` e `git pull --ff-only` sul branch corrente.
4. Se pull fallisce o i branch sono divergenti, non risolvere autonomamente: mostrare lo stato e attendere.
5. Lavorare su un branch `hermes/<task>`, mai direttamente su `main`.
6. Cercare simboli e usi esatti con ricerche mirate; leggere manifest, configurazione, sorgenti e test pertinenti.
7. Trattare ogni diff preesistente come del maintainer, salvo richiesta esplicita.

## 2. Eseguire le richieste per impostazione predefinita

Una richiesta sul repository è azionabile salvo richiesta esplicita di solo brainstorming. Ispezionare, applicare la modifica minima utile e verificarla.

Se manca un'evidenza runtime necessaria, aggiungere solo logging diagnostico mirato e identificabile, senza introdurre comportamento speculativo. Chiedere poi i soli log necessari.

Prima di modificare chiarire mentalmente: risultato atteso, ambito, vincoli e criteri di accettazione. Fare una domanda solo quando interpretazioni diverse cambiano file o comportamento.

## 3. Fonti di verità

1. Codice e configurazione correnti, verificati con esecuzione.
2. Output di build, check, test e prove runtime.
3. Documentazione esplicita del progetto.
4. Wiki con `confidence: medium` o `low`.
5. Inferenza dell'agente, mai presentata come fatto.

Un componente presente dimostra che il codice esiste, non che browser, permessi, servizi esterni o ogni flusso utente siano accettati.

## 4. Disciplina delle modifiche

- Toccare solo i file necessari; evitare refactoring ampi durante una feature.
- Preservare standalone components, Signals, `OnPush`, tipizzazione rigorosa, localizzazione italiana, accessibilità e responsive design.
- Non aggiungere dipendenze o cambiare toolchain senza autorizzazione esplicita.
- Non sovrascrivere modifiche locali, fare reset o riscrivere la storia senza richiesta.
- Non creare commit o push salvo richiesta esplicita dell'utente.
- Non copiare credenziali, token, password o endpoint privati nella wiki.
- Controllare il manifest prima di aggiungere import o dipendenze.
- Non usare `any` per aggirare errori di tipizzazione.

## 5. Convenzioni del codice

- Componenti Angular standalone con `ChangeDetectionStrategy.OnPush`.
- Stato reattivo locale con `signal`/`computed`; dati statici readonly e tipizzati.
- Pagine e feature non necessarie al bootstrap con `loadComponent`/`loadChildren`.
- Componenti figli in sottocartelle dedicate.
- `camelCase` nel frontend; preservare eventuali campi `snake_case` dei contratti API con mapping esplicito.
- `private` per logica interna e `protected` per membri usati dai template.
- Dichiarare un access modifier esplicito su funzioni e metodi.
- Nuove funzioni: JSDoc descrittivo, `@param` per parametri e `@returns` quando applicabile.
- Costanti endpoint nel formato `ENDPOINT_<PURPOSE>`.
- Formattare gli `if` sempre con graffe e corpo indentato.
- API web tramite `Api`; errori con `ApiError` e messaggi pronti; conferme con `ConfirmService`, mai `alert` o `window.confirm`.

## 6. API, dati e sicurezza

- Validare gli input con gli schemi Zod in `packages/shared/src/schemas.ts`.
- Tipi, DTO e catalogo dominio condivisi in `packages/shared`.
- Modifiche DB solo con `drizzle-kit generate` e migrazione versionata.
- Documenti con `baseVersion` e versioning ottimistico.
- Account solo tramite invito; admin solo via CLI.
- Le mutazioni autenticate rispettano CSRF; le route progetto applicano `projectScope`.
- Credenziali cliente cifrate con `SecretBox` AES-256-GCM; reveal solo admin e sempre auditato.
- Mai restituire password, hash, token, segreti o dati non visibili al cliente.

## 7. Realtime e lifecycle

Prima di introdurre realtime cercare lifecycle, subscription, flag e handler già esistenti. Annotare `sorgente → parser → stato → renderer → guardia di modalità`, mantenere un solo proprietario per start/refresh/rendering e verificare attivazione, pausa, cambio contesto e distruzione. Il progetto corrente non espone ancora una feature realtime documentata: questa regola è preventiva.

## 8. Verifica

Eseguire separatamente i gate disponibili:

```bash
npm run check
npm run test
npm run build
```

Per modifiche UI eseguire anche smoke test del dev server/browser quando disponibile. Un build verde non prova rendering, responsive, accessibilità, integrazioni esterne o dati reali.

Riportare solo comandi realmente eseguiti e distinguere chiaramente blocchi ambientali da errori di codice.

## 9. Manutenzione wiki e handoff

Dopo una modifica sostanziale:

1. aggiornare pagina progetto, modulo o stato;
2. riparare i link utili;
3. aggiornare `index.md` se cambiano pagine o percorsi;
4. aggiungere una voce concisa a `log.md` con file e verifica;
5. abbassare `confidence` o aggiungere un gap se la verifica è incompleta.

Handoff: **Changed**, **Verified**, **Blocked/remaining**. Prima di finire eseguire `git status --short --branch` e `git diff --check`.
