---
title: "Childhood Friendship"
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
---

## Short Description

Childhood Friendship è la piattaforma software del superproject, con sito pubblico, area team/admin e portale clienti.

## Description

La repository contiene workspace npm, web app Angular standalone, API Express/Drizzle e package shared. Il contesto registrato nel README include landing pubblica, admin e portale clienti. Le configurazioni e le verifiche provider/deploy sono datate e non sostituiscono un controllo live.

## Functional Characteristics

- Shows contenuti pubblici e aree applicative distinte per team e clienti.
- Manages progetti, documenti, lead e workflow associati tramite API e UI secondo il codice documentato.
- Validates dati d’ingresso attraverso schemi condivisi.

## Interfaces And Protocols

La web app comunica con l’API server-side. Gli endpoint, i dati visibili a ciascun ruolo e i provider attivi devono essere verificati in sorgente e nel target operativo.

## Dependencies And Relationships

Il progetto dipende da Angular, Express, Drizzle, PostgreSQL e dai pacchetti shared. Per dati aziendali, pagamenti, privacy e fornitori usare [compliance.md](../compliance.md), senza interpretarlo come parere o attestazione legale.

## Procedures

Per avvio e comandi verificare il [README](../../../README.md); per stato datato di provider e deploy consultare [current-status.md](../current-status.md) e riverificare prima di operare.
