---
title: Confini operativi
created: 2026-10-03
updated: 2026-10-03
type: policy
tags: [guidance, security, architecture]
project: childhood-friendship-website
status: active
confidence: high
sources: [Agents.md, apps/api/src/middleware, apps/api/src/modules/projects/access.ts]
---

# Confini operativi

Regole che nessuna modifica (umana o AI) deve violare senza una nuova ADR.

## Sicurezza

- **Mai** endpoint di registrazione pubblica: gli account nascono solo da invito (`/api/users/invites`).
- **Mai** endpoint che eseguono SQL/DDL su richiesta HTTP (il vecchio `/api/fix-username-constraint` è stato eliminato di proposito).
- Gli admin si creano solo da CLI: `npm run admin:create`.
- Ogni rotta sotto `/projects/:projectId/*` passa da `projectScope` → `loadProjectFor`: è l'unico punto di controllo accessi ai progetti.
- Un cliente non vede mai: credenziali, marketing, versioni dei documenti, documenti con `clientVisible = false`, registro attività.
- I segreti dei clienti si salvano solo cifrati (`SecretBox`, AES-256-GCM). Rivelazione: solo admin, sempre in `audit_log`.
- Ogni mutazione rilevante scrive in `audit_log` tramite `audit()`.
- Nessun segreto in repository, wiki o log. `.env` resta fuori da git.

## Architettura

- Frontend: Angular 22, componenti standalone, Signals, OnPush, nessun `any`.
- Il bundle web importa da `@cf/shared` solo `catalog` e `types` (niente Zod nel browser).
- Validazione input lato server sempre con gli schemi Zod di `packages/shared/src/schemas.ts`.
- Modifiche allo schema DB solo via `drizzle-kit generate` + migrazione versionata in `apps/api/drizzle`.
- Nuove dipendenze: solo con approvazione esplicita, annotata in [[log.md|log]].

Pagine correlate: [[best-practices.md|best practice]], [[architecture/system-architecture.md|architettura]].
