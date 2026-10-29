# Schema della documentazione e del sistema

## Scopo

Questa wiki contiene solo conoscenza durevole: architettura, modelli, convenzioni, limiti, stato e decisioni. Il codice e la configurazione correnti prevalgono sulla documentazione.

## Struttura documentale

- `index.md`: indice completo della struttura.
- `agent-guide.md`: regole operative per agenti e sviluppatori.
- `current-status.md`: snapshot verificabile e punti aperti.
- `modules/component-catalog.md`: inventario di moduli, componenti, servizi e utility.
- `projects/childhood-friendship-website.md`: configurazione e integrazioni del progetto.
- `compliance.md`: regole fiscali e privacy, Neon in UE, fornitori.
- `bugs/`: schede di bug durevoli; vuota finché non esiste una diagnosi verificata.
- `log.md`: storico sintetico, append-only.

## Modello applicativo

```text
Browser (landing / admin / portale)
        │ HTTP, cookie sessione, CSRF
Angular standalone (apps/web)
        │ API JSON
Express + Drizzle (apps/api)
        │
Postgres/Neon in produzione · PGlite in locale
        │
packages/shared: tipi, catalogo dominio, schemi Zod
```

Entità principali: `users`, `sessions`, `clients`, `projects`, `tasks`, `documents`, `document_versions`, `messages`, `credentials`, `marketing_*`, `leads`, `project_files`, `contract_signatures`, `payments`, `invoices`, `password_resets`, `audit_log`, `ai_usage`.

Relazioni essenziali:

- un cliente possiede progetti e utenti cliente;
- un progetto possiede checklist, documenti, messaggi, credenziali, materiali, firme del contratto, incassi, fatture e dati marketing;
- una fattura punta all'incasso che la origina; numero e stato SDI arrivano dal provider di fatturazione;
- un documento ha versioni e flusso bozza → revisione → approvato/modifiche richieste;
- i lead possono essere convertiti in clienti;
- ogni mutazione sensibile produce audit.

## Contratti

- Input API validati con gli schemi in `packages/shared/src/schemas.ts`.
- DTO e stati condivisi in `packages/shared/src/types.ts` e `catalog.ts`.
- Errori API serializzati come `{ error: { code, message, details } }`.
- Le modifiche documentali richiedono `baseVersion` e creano una nuova versione.
- Nessun segreto, token o valore `.env` va scritto qui.

## Convenzioni della wiki

- Markdown sintetico, titoli chiari, tabelle quando riducono ridondanza.
- Percorsi repository-relative e comandi realmente verificati.
- Aggiornare indice e log insieme a ogni modifica strutturale.
- Distinguere presenza nel codice da verifica browser, produzione o servizio esterno.
