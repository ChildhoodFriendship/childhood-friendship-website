---
title: Uso efficiente del contesto
author: project
created: 2026-09-28
updated: 2026-09-28
type: policy
tags: [guidance, token-usage, workflow, performance]
project: childhood-friendship-website
status: active
confidence: high
sources: [SCHEMA.md, agent-guide.md, index.md, package.json]
---

# Uso efficiente del contesto

Questa pagina definisce come spendere il contesto nel repository. L'obiettivo non è leggere meno a ogni costo, ma leggere il minimo insieme di evidenze sufficiente per una modifica corretta.

## Budget di orientamento

1. `SCHEMA.md`
2. `index.md`
3. `current-status.md`
4. ultime 20-30 righe di `log.md`
5. `git status --short --branch`

Non riversare nel contesto l'intero repository, `node_modules` o `dist/`. Usare la mappa per scegliere una o due pagine e i simboli sorgente pertinenti.

## Regole di indagine

- Cercare simboli, route, endpoint o componenti prima di aprire i file.
- Leggere intervalli delimitati con `read_file`; paginare file lunghi come l'hero Three.js.
- Tracciare definizione → chiamanti → tipi/contratti e fermarsi quando flusso e accettazione sono chiari.
- Raggruppare ricerche e letture indipendenti nello stesso turno.
- Usare riepiloghi programmatici per inventari ripetitivi.
- Preferire una fonte autorevole alla rilettura di parafrasi.
- Scrivere nella wiki i risultati durevoli con percorso sorgente.
- Non copiare segreti o file generati grandi.

## Dimensionamento

| Attività | Leggere prima | Fermarsi quando |
|---|---|---|
| Fix piccolo | stato, indice, file obiettivo, chiamanti | causa e verifica sono note |
| Modifica modulo | stato, pagina modulo, componenti e contratti | confini e flusso dati sono chiari |
| Modifica trasversale | stato, architettura, simboli interessati | ogni confine ha un controllo di accettazione |
| Audit ampio | stato, pagine, ricerche mirate, inventario scriptato | il risultato è una tabella con evidenze |

## Sintesi per handoff

Conservare:

- fatti e percorsi sorgente;
- assunzioni e confidence;
- file che devono cambiare;
- file intenzionalmente non modificati;
- comandi ancora necessari.

Usare il formato di [[agent-guide.md|guida agenti]], non inoltrare output grezzo.

## Sprechi da evitare

- Rileggere `package.json` dopo aver risolto la domanda sulle dipendenze.
- Usare `dist/` per capire il comportamento sorgente.
- Cercare simboli applicativi in `node_modules`.
- Aprire ogni componente quando l'attività ne nomina uno.
- Ripetere una patch fallita senza rileggere il file corrente.
- Dichiarare completamento dal solo build quando servono browser o Formspree.

Un agente è concluso quando ha applicato la modifica minima, eseguito la verifica pertinente, aggiornato la conoscenza durevole e lasciato evidenze rintracciabili dall'[[index.md|indice]].
