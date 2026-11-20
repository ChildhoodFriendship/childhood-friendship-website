---
title: "Moduli applicativi"
status: active
role: functional_module
source:
  references:
    - part: other
      path: packages/shared/src/types.ts
    - part: other
      path: packages/shared/src/catalog.ts
---

## Short Description

Questa area raggruppa i moduli web, API e shared-package che compongono il superproject.

## Description

Il catalogo componenti segue i confini del codice: landing pubblica e componenti interattivi, app web autenticata, moduli API e servizi shared. La pagina [Catalogo componenti](component-catalog.md) elenca responsabilità e file di riferimento; non è un inventario esaustivo del prodotto.

## Functional Characteristics

- Shows il sito pubblico e le aree applicative attraverso la web app.
- Manages funzionalità amministrative e del portale tramite route e moduli separati.
- Validates richieste API e dati condivisi secondo gli schemi del package comune.

## Interfaces And Protocols

I componenti web scambiano dati con l’API HTTP/JSON; i contratti e i DTO vanno verificati nelle sorgenti e non dedotti dai nomi dei moduli.

## Dependencies And Relationships

I moduli dipendono da `apps/web`, `apps/api` e `packages/shared`. Le regole di accesso a progetti e clienti sono un vincolo trasversale del sistema.
