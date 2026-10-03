---
title: Runbook di sviluppo locale
created: 2026-09-28
updated: 2026-10-03
type: runbook
tags: [runbook, workflow, testing]
project: childhood-friendship-website
status: active
confidence: high
sources: [package.json, apps/api/package.json, apps/web/package.json, apps/api/.env.example, apps/web/proxy.conf.json]
---

# Runbook di sviluppo locale

## Prerequisiti

- Node.js ≥ 22. Nessun Postgres necessario: in locale l'API usa PGlite (`DATABASE_URL=pglite:./.data/dev`).

## Avvio

```bash
npm ci
cp apps/api/.env.example apps/api/.env   # compila JWT_SECRET e CREDENTIALS_KEY
npm run admin:create -- --email admin@local.test --name "Admin"
npm run dev:api    # :3000, applica le migrazioni automaticamente su PGlite
npm run dev:web    # :4200, /api inoltrato a :3000
```

Per ricominciare da zero: cancellare `apps/api/.data/`.

## Verifica prima di un handoff

```bash
npm run check   # tipi shared + api + build Angular dev
npm test        # 26 test di integrazione API
npm run build   # build produzione
```

## Modificare lo schema DB

1. Modifica `apps/api/src/db/schema.ts`.
2. `npm run db:generate` → nuova migrazione in `apps/api/drizzle/` (committarla).
3. Riavvia `dev:api` (PGlite) o `npm run db:migrate` (Postgres).

Pagine correlate: [[runbooks/deploy-production.md|deploy]], [[best-practices.md|best practice]].
