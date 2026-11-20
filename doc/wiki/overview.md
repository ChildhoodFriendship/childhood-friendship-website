---
title: "Childhood Friendship — panoramica del superprogetto"
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

Childhood Friendship è un superprogetto software multipacchetto che comprende un sito pubblico, un'area amministrativa interna, un portale clienti, un'API e pacchetti di dominio condivisi.

## Description

Il repository coordina `apps/web`, `apps/api` e `packages/shared` tramite npm workspaces. L'applicazione web usa componenti Angular standalone; l'API usa Express e Drizzle con PostgreSQL; tipi condivisi, dati di catalogo e schemi Zod risiedono nel pacchetto condiviso. L'area [architettura](architecture/overview.md) descrive i confini del workspace, l'area [moduli](modules/overview.md) collega le responsabilità dei componenti e l'area [progetti](projects/overview.md) fornisce il contesto a livello di prodotto.

## Functional Characteristics

- Presenta il sito pubblico e rende disponibili l'area amministrativa e il portale clienti tramite l'applicazione web.
- Gestisce i flussi relativi a progetti, clienti, documenti e contatti tramite l'API e i moduli web descritti nel repository.
- Convalida gli input API tramite schemi condivisi, come documentato nelle sorgenti.

## Interfaces And Protocols

Il browser comunica con l'API Express usando HTTP/JSON e le protezioni basate su sessioni/cookie descritte nella documentazione del progetto. L'API accede a PostgreSQL. Prima di documentare rotte, payload e regole di autorizzazione esatte, verificarle nel codice corrente.

## Dependencies And Relationships

L'applicazione web, l'API e il pacchetto condiviso sono collegati tramite npm workspaces. Un controllo locale non verifica provider di produzione, deploy o integrazioni esterne. Lo stato operativo è descritto nello [stato corrente](current-status.md); le indicazioni su conformità e trattamento dei dati restano in [compliance.md](compliance.md).

## Procedures

Per i comandi del workspace, la configurazione locale e i vincoli operativi, consultare il [README root](../../README.md), [AGENTS.md](../../AGENTS.md) e il runbook pertinente. Su questa VM non eseguire installazioni, migrazioni, build, test o operazioni di deploy senza un'autorizzazione specifica per l'incarico.
