---
title: Childhood Friendship website
created: 2026-10-06
updated: 2026-10-06
type: project
tags: [project, architecture, integration, deployment]
project: childhood-friendship-website
status: active
confidence: high
sources: [package.json, README.md, apps/web/angular.json, apps/web/src/app/app.routes.ts, apps/api/src/app.ts, packages/shared/src]
---

# Childhood Friendship website

## Scopo

Piattaforma con sito pubblico commerciale, area admin per clienti/progetti/documenti/marketing e portale clienti. Il form pubblico alimenta i lead interni.

## Repository e architettura

- Root: monorepo npm workspaces.
- `apps/web`: Angular 22 standalone con landing, caveau, autenticazione, admin e portale.
- `apps/api`: Express 5 + Drizzle; auth, ruoli, clienti, progetti, documenti, marketing, AI, lead e audit.
- `packages/shared`: tipi, DTO, catalogo di dominio e schemi Zod.
- Locale: PGlite; produzione prevista: PostgreSQL/Neon dietro deploy Vercel.

## Route principali

- `/`: landing pubblica e form lead.
- `/caveau`: ambiente 3D.
- `/login`, `/invito/:token`: accesso e attivazione account.
- `/admin/**`: area admin/staff.
- `/portale/**`: area clienti.
- `GET /api/health`: health check.
- `POST /api/public/leads`: lead pubblico; le altre aree API richiedono autenticazione secondo il modulo.

## Comandi

```bash
npm ci
npm run dev:api
npm run dev:web
npm run check
npm run test
npm run build
npm run db:generate
npm run db:migrate
npm run admin:create
```

In locale l'API usa `.env` e PGlite; non inserire valori dei segreti nella wiki. Le migrazioni partono da `apps/api/src/db/schema.ts` e vengono generate in `apps/api/drizzle/`.

## Sicurezza e integrazioni

- Cookie di sessione, refresh rotation, CSRF, helmet, rate limit e guard di ruolo.
- Gli account sono creati tramite invito; gli admin tramite CLI.
- Le route progetto applicano isolamento per cliente.
- Le credenziali cliente sono cifrate e la rivelazione è riservata agli admin con audit.
- I provider AI sono configurabili; le chiavi restano esclusivamente nell'ambiente runtime.
- Hosting, database, provider AI e servizi esterni non sono considerati verificati dalla sola build.

## Limiti noti

- Deploy e smoke test nell'ambiente target da verificare.
- Nessuna suite frontend automatica documentata.
- Responsive, accessibilità, fluidità 3D e provider esterni richiedono prove dedicate.

Pagine correlate: [[../current-status.md|stato corrente]], [[../modules/component-catalog.md|catalogo componenti]] e [[../agent-guide.md|guida agenti]].
