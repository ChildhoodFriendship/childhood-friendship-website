---
title: Runbook di sviluppo locale
created: 2026-09-28
updated: 2026-09-28
type: runbook
tags: [runbook, workflow, testing, deployment, security]
project: childhood-friendship-website
status: active
confidence: high
sources: [package.json, package-lock.json, angular.json, src/environments/environment.example.ts, src/app/landing-page/contact/contact-section.component.ts]
---

# Runbook di sviluppo locale

## Quando usarlo

Usare questa procedura prima di un handoff, per un problema di build o quando serve uno smoke test della UI.

## Prerequisiti

- Node.js/npm compatibili con Angular 22.
- Working tree pulito o compreso; eseguire `git status --short --branch`.
- Configurazione Formspree disponibile solo nell'environment locale approvato.
- Mai inserire password, token o dati personali nella wiki, nei log o nei commit.

## Procedura

1. Installare le dipendenze bloccate: `npm ci`.
2. Avviare il server: `npm start`.
3. Aprire la pagina e verificare navigazione ad ancore, responsive layout, hero, modale e tab prezzi.
4. Compilare il form con dati di test non sensibili e verificare lo stato visualizzato senza registrare il contenuto.
5. Eseguire `npm run build`.
6. Eseguire `npm run test` e `npm run lint`, registrando il blocco se gli script non sono compatibili/configurati.

## Verifica

- Il server locale parte senza errori.
- Il build termina e genera `dist/childhood-friendship-website`.
- Hero, modale, prezzi e form sono usabili da tastiera e su viewport ridotte.
- L'invio esterno viene verificato solo con un account/dato di test autorizzato.

## Recupero

- Non cancellare o resettare modifiche locali non pertinenti.
- Gli artefatti in `dist/` sono generati e non sono fonte di verità.
- Se il server è obsoleto, fermarlo e riavviare dopo aver controllato sorgenti e configurazione.
- Se una modifica non è pronta, revertire solo i file della task dopo aver consultato l'utente.

## Troubleshooting

- **Pagina vuota:** controllare console browser, route lazy e primo errore di bootstrap.
- **Hero senza interazione:** controllare inizializzazione canvas, dimensioni viewport e teardown Three.js.
- **Form in errore:** controllare la disponibilità dell'endpoint configurato e la risposta di rete senza stampare dati.
- **Test fallisce per argomenti:** lo script corrente passa `--watch` e `--browsers`, rifiutati dal builder osservato.
- **Lint non parte:** `angular.json` non definisce un target `lint`; non installare automaticamente una soluzione senza richiesta.
- **Build fallisce:** correggere il primo errore sorgente, non il bundle minificato in `dist/`.

Pagine correlate: [[../projects/childhood-friendship-website.md|progetto]], [[../architecture/system-architecture.md|architettura]], [[../current-status.md|stato]] e [[../agent-guide.md|guida agenti]].
