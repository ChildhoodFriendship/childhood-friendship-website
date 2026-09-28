---
title: Guida operativa per gli agenti
created: 2026-09-28
updated: 2026-09-28
type: guidance
tags: [guidance, workflow, documentation]
project: childhood-friendship-website
status: active
confidence: high
sources: [SCHEMA.md, current-status.md, token-usage.md, package.json, angular.json, Agents.md]
---

# Guida operativa per gli agenti

Questo è l'accordo operativo per chi modifica `childhood-friendship-website`. Ogni attività deve essere piccola, sicura, verificabile e riprendibile.

## 1. Orientarsi prima di agire

1. Leggere [[SCHEMA.md|SCHEMA]], [[index.md|indice]], [[current-status.md|stato corrente]] e le ultime 20-30 righe di [[log.md|log]].
2. Eseguire `git status --short --branch` prima di cambiare file.
3. Cercare simboli e usi esatti con ricerche mirate.
4. Leggere sorgenti, configurazione e test pertinenti prima di proporre una forma.
5. Trattare il diff già presente come dell'utente, salvo richiesta esplicita.

## 1b. Eseguire le richieste per impostazione predefinita

Una domanda sul repository è una richiesta azionabile, salvo che l'utente chieda esplicitamente solo brainstorming. Ispezionare, applicare la modifica minima utile e verificarla.

Se manca un'evidenza runtime necessaria per una modifica sicura, aggiungere solo logging diagnostico mirato e chiaramente identificabile, senza introdurre comportamento speculativo. Chiedere poi i soli log necessari.

## 2. Ordine delle fonti di verità

1. Codice e configurazione correnti, verificati con esecuzione.
2. Output di build, lint, test e prove runtime.
3. Documentazione esplicita del progetto.
4. Pagine wiki con `confidence: medium` o `low`.
5. Inferenza dell'agente, mai presentata come fatto senza etichetta.

La presenza di un componente prova che il codice esiste, non che ogni flusso browser o servizio esterno sia accettato.

## 3. Disciplina delle modifiche

- Toccare solo i file necessari.
- Preservare Angular standalone, Signals, tipizzazione rigorosa, accessibilità e responsive design già adottati.
- Preferire patch piccole; evitare refactoring ampi durante una feature.
- Non sovrascrivere modifiche locali, fare reset, commit, push o riscrivere la storia senza richiesta esplicita.
- Il codice prodotto dall'agente non deve creare commit o eseguire push; lasciare le modifiche non committate salvo richiesta esplicita.
- Non inserire credenziali, token, password o endpoint privati nella wiki.
- Controllare `package.json` prima di aggiungere import o dipendenze.
- Non usare `any` per eludere la tipizzazione.

## 4. Gate di verifica

Eseguire prima i controlli stretti e poi quelli del progetto:

- `npm run test` — attualmente lo script è definito, ma lo snapshot del 2026-09-28 fallisce perché il builder Angular corrente rifiuta gli argomenti `--watch` e `--browsers`.
- `npm run lint` — attualmente bloccato: `angular.json` non definisce un target `lint`.
- `npm run build` — build di produzione; deve completare senza errori.
- `npm start` — smoke test manuale del comportamento browser quando cambia la UI.

Riportare solo comandi realmente eseguiti. Il build non dimostra da solo che Formspree, browser o accessibilità siano verificati.

## 5. Convenzioni del codice osservate

- Usare componenti standalone e `ChangeDetectionStrategy.OnPush`.
- Usare `signal` per stato locale reattivo e tipizzare esplicitamente le unioni di stato.
- Mantenere i componenti figli in sottocartelle dedicate del componente padre.
- Conservare `camelCase` nel TypeScript e nomi HTML/accessibilità espliciti.
- Preferire `protected` per membri usati dai template e `private` per riferimenti interni.
- Dichiarare un access modifier esplicito su funzioni e metodi (`private`, `protected` o `public`) e, quando coerente, sui membri.
- Formattare codice e template secondo lo stile Angular/TypeScript esistente.
- Aggiungere un commento breve sopra una funzione o variabile solo quando il nome non è sufficiente a spiegarla; evitare commenti ridondanti.
- Se in futuro verranno introdotte costanti per endpoint, usare il formato `ENDPOINT_<PURPOSE>` e separare lo scopo HTTP dal metodo.
- Non introdurre librerie senza autorizzazione; Three.js è già una dipendenza dichiarata per l'hero 3D.
- Mantenere i messaggi e i contenuti in italiano finché non viene definita una strategia di localizzazione diversa.

## 5b. Flussi di configurazione e persistenza futuri

Il progetto corrente non contiene componenti settings, dialoghi CRUD o API applicative. Se verranno introdotti, mantenere la separazione tra preparazione UI (`requestAdd()`/`requestEdit()`/`requestDelete()`) ed esecuzione (`submitSave(data)`/`submitDelete(data)`), con risultati esplicitamente tipizzati e un solo percorso canonico di persistenza. Usare `loadData()` o `refreshData()` per il caricamento e non far ricostruire form o popup ai metodi di submit.

## 5c. Flussi realtime e lifecycle futuri

Il progetto corrente non contiene integrazioni realtime. Prima di introdurne una, cercare ogni lifecycle, subscription, flag e handler già esistente; mantenere un solo proprietario per start, refresh, rendering e cambio modalità; adattare tutti i chiamanti prima di rimuovere una funzione; verificare attivazione, pausa, cambio contesto e distruzione del componente. Annotare prima il flusso `sorgente -> parser -> stato -> renderer -> guardia di modalità` e rendere esplicito il cleanup.

## 6. Manutenzione della wiki

Dopo una modifica sostanziale:

1. Aggiornare la pagina di progetto, architettura, modulo, runbook o stato interessata.
2. Riparare o aggiungere `[[wikilinks]]` utili.
3. Aggiornare `index.md` se cambiano pagine o percorsi.
4. Aggiungere una voce concisa a `log.md` con file e verifica.
5. Ridurre `confidence` o aggiungere una domanda aperta se la verifica è incompleta.

## 7. Formato handoff

Un handoff utile contiene:

- **Ambito:** file e comportamento modificati.
- **Evidenze:** comandi, test e percorsi sorgente.
- **Stato:** completato, bloccato o parzialmente verificato.
- **Rischio residuo:** browser, servizio esterno, configurazione o accessibilità.
- **Prossima azione:** un passo concreto.

Pagine correlate: [[current-status.md|stato corrente]], [[modules/application-modules.md|moduli applicativi]] e [[token-usage.md|uso del contesto]].
