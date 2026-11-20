---
title: "Architettura di sistema"
status: active
role: application
source:
  references:
    - part: configuration
      path: package.json
    - part: api
      path: apps/api/src/app.ts
    - part: model
      path: packages/shared/src/types.ts
    - part: model
      path: packages/shared/src/schemas.ts
---

## Short Description

Il superproject unisce una web app Angular, un’API Express/Drizzle e pacchetti condivisi per tipi e validazione.

## Description

Il workspace contiene `apps/web`, `apps/api` e `packages/shared`. In sviluppo locale l’API può usare PGlite secondo la configurazione del progetto; il backend di produzione è documentato come PostgreSQL/Neon. La presenza delle configurazioni locali non dimostra lo stato corrente dei provider remoti.

Il modello concettuale documentato include utenti/sessioni, clienti, progetti, attività, documenti/versioni, messaggi, credenziali, marketing, lead, materiali, firme, pagamenti, fatture, reset password, audit e uso AI. Le entità e i vincoli effettivi devono essere ricontrollati in `apps/api/src/db/schema.ts` e nelle migrazioni prima di intervenire.

## Functional Characteristics

- Manages workflow di progetto, documenti e comunicazione tramite API e interfacce dedicate.
- Validates input API con schemi condivisi e DTO coerenti con i ruoli.
- Stores dati applicativi in PostgreSQL tramite Drizzle.
- Uses DTO cliente dedicati per separare i dati del portale dai campi interni del team.

## Interfaces And Protocols

Il browser invia richieste HTTP/JSON all’API Express. L’autenticazione usa sessione, cookie e protezioni CSRF secondo il progetto. Gli errori API sono documentati nel formato `{ error: { code, message, details } }`; le route e i payload esatti vanno verificati in `apps/api/src/`.

## Dependencies And Relationships

`apps/web` dipende dalle API e dai tipi condivisi; `apps/api` dipende da `packages/shared`, Drizzle e PostgreSQL. Migrazioni versionate definiscono il database. PGlite è il backend locale descritto nei documenti, mentre l’hosting remoto è dipendenza esterna.

## Procedures

Prima di modificare una relazione o un contratto, verificare schema Drizzle, migrazioni, Zod schemas, DTO, test e consumer web. Preservare autorizzazioni e confini server/client; non esporre credenziali o campi interni senza una decisione autorizzata. Non eseguire migrazioni o operazioni provider senza autorizzazione. Per sicurezza e privacy consultare [compliance](../compliance.md).
