---
title: Stato corrente — Childhood Friendship website
created: 2026-09-28
updated: 2026-09-28
type: status
tags: [status, milestone, project]
project: childhood-friendship-website
status: active
confidence: medium
sources: [package.json, angular.json, src/main.ts, src/app/app.routes.ts, src/app/landing-page, src/environments/environment.ts]
---

# Stato corrente — Childhood Friendship website

> Snapshot: 2026-09-28. Questa pagina descrive evidenze del repository e non certifica un rilascio in produzione.

## Snapshot del repository

| Elemento | Valore osservato |
|---|---|
| Branch | `main` |
| Framework | Angular 22, componenti standalone |
| Versione package | `0.1.0` |
| Entry point | `src/main.ts` |
| Route | route vuota lazy-loaded verso la landing; wildcard verso la route vuota |
| Stato applicazione | landing page aziendale responsive con hero 3D, servizi, listino, metodo, contatti e footer |
| Integrazione esterna | invio form via Formspree; endpoint letto dall'environment |
| Test dichiarato | `npm run test` presente ma non compatibile con gli argomenti passati allo schema corrente |
| Lint dichiarato | `npm run lint` presente ma senza target `lint` in `angular.json` |

## Stato funzionale osservato

- La landing è composta da header, hero, trust bar, servizi, prezzi, chi siamo, metodo, contatti e footer.
- L'hero usa Three.js e Signals per un'esperienza interattiva con stato di sblocco e modale progetto.
- La sezione prezzi alterna due viste tramite un Signal locale.
- Il form di contatto invia `FormData` con `fetch` e gestisce gli stati idle, submitting, success ed error.
- Il caricamento della landing è lazy tramite `loadComponent`.

## Verifica eseguita

| Controllo | Risultato | Evidenza |
|---|---|---|
| `npm run test` | **Bloccato** | Angular segnala `Unknown arguments: watch, browsers`. |
| `npm run lint` | **Bloccato** | Non esiste un target `lint` nel progetto Angular. |
| `npm run build` | **Passato** | Bundle iniziali e chunk lazy generati in `dist/childhood-friendship-website`. |
| `git diff --check` | **Passato** | Nessun errore di whitespace nel diff verificato. |

## Milestone

| Milestone | Stato | Evidenza / gate successivo |
|---|---|---|
| M0 — Bootstrap e shell | **Completato nel codice** | Bootstrap standalone, router, `AppComponent` e landing lazy presenti. |
| M1 — Landing e contenuti commerciali | **Completato nel codice** | Sezioni e listino presenti nei componenti della landing. |
| M2 — Interazione hero e prezzi | **Completato nel codice; smoke test browser da fare** | Three.js e tab prezzi sono implementati; serve verifica manuale responsive/accessibilità. |
| M3 — Contatto esterno | **Implementato; integrazione live non certificata** | Formspree è configurato via environment; serve invio controllato senza esporre dati sensibili. |
| M4 — Hardening release | **Aperto** | Correggere o ridefinire script test/lint e completare smoke test browser. |

## Gap espliciti

- Non è verificato dal codice soltanto che l'invio Formspree arrivi correttamente al destinatario configurato.
- Non è disponibile un target Angular `lint` funzionante.
- Lo script test esiste ma usa argomenti rifiutati dal builder corrente; non è stata dichiarata una suite di test osservabile nel repository.
- Il build supera i budget configurati, ma non sostituisce la verifica visuale su viewport e interazioni.
- Non sono presenti evidenze documentate di deployment o rollback in questo repository.

## Prossime azioni

1. Eseguire smoke test browser su hero, modale, tab prezzi, navigazione ad ancora e form.
2. Decidere e documentare una configurazione di test compatibile con Angular 22.
3. Aggiungere una configurazione lint solo con richiesta/decisione esplicita e dipendenza autorizzata.
4. Verificare accessibilità da tastiera e comportamento responsive.

Pagine correlate: [[projects/childhood-friendship-website.md|progetto]], [[architecture/system-architecture.md|architettura]], [[modules/application-modules.md|moduli]] e [[runbooks/local-development.md|runbook locale]].
