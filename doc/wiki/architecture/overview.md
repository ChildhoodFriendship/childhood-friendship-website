---
title: "Architettura del superproject"
status: active
role: application
source:
  references:
    - part: configuration
      path: package.json
    - part: configuration
      path: apps/web/package.json
    - part: configuration
      path: apps/api/package.json
    - part: configuration
      path: packages/shared/package.json
---

## Short Description

Questa area descrive la separazione tra web app, API e pacchetti condivisi del superproject.

## Description

Il monorepo usa npm workspaces `apps/*` e `packages/*`. Il browser presenta landing pubblica, admin e portale; l’API gestisce autorizzazione e persistenza; `packages/shared` contiene tipi e schemi condivisi. La [sezione di architettura di sistema](system-architecture.md) riassume confini, dati e contratti senza sostituire l’ispezione del codice.

## Functional Characteristics

- Manages il coordinamento delle app tramite workspace e script root.
- Shares tipi e schemi validazione tra API e web tramite `packages/shared`.
- Separates l’interfaccia pubblica, l’area team e il portale clienti secondo le route documentate nel progetto.

## Interfaces And Protocols

La web app comunica con l’API via HTTP/JSON. Il protocollo applicativo e i controlli sessione/CSRF devono essere verificati nelle route e middleware correnti.

## Dependencies And Relationships

L’area dipende dai package manifests root e dei componenti; il modello di dati e le relazioni persistenti appartengono alle migrazioni e agli schemi API, non a questa overview.
