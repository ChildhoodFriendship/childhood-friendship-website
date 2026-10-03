---
title: Runbook deploy produzione
created: 2026-10-03
updated: 2026-10-03
type: runbook
tags: [runbook, deployment, database, security]
project: childhood-friendship-website
status: active
confidence: medium
sources: [vercel.json, api/index.mjs, .github/workflows/deploy.yml, apps/api/.env.example]
---

# Runbook deploy produzione

> `confidence: medium`: configurazione verificata in locale (build, migrazioni, smoke test), primo deploy Vercel ancora da eseguire.

## Una tantum

1. **Database Neon**: crea il progetto, copia la connection string *pooled* (`…-pooler…?sslmode=require`).
2. **Segreti** (mai committarli):
   - `JWT_SECRET`: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
   - `CREDENTIALS_KEY`: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` — **conservala in un password manager: se la perdi le credenziali clienti salvate non sono più leggibili.**
3. **Vercel** → progetto collegato al repo, Root Directory = repository root. Environment Variables (Production):
   `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `CREDENTIALS_KEY`, `APP_URL=https://<dominio>`, opzionali `GEMINI_API_KEY`, `AI_MODEL`, `AI_DAILY_LIMIT`.
4. **GitHub** → Settings → Environments → `production`: secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `DATABASE_URL`, `JWT_SECRET`, `CREDENTIALS_KEY`.
5. Prima migrazione e admin, da un terminale con le variabili di produzione:
   ```bash
   npm ci
   npm run db:migrate
   npm run admin:create -- --email <tua-email> --name "<nome>"
   ```

## A ogni push su `main`

Workflow `CI e deploy`: `npm ci` → `check` → `test` → `build` → migrazioni → `vercel deploy --prod`.
Le pull request eseguono solo la verifica.

## Verifiche post-deploy

- `GET https://<dominio>/api/health` → `{"ok":true}`
- Login admin, creazione progetto di prova, invio form contatti dalla landing → compare in Lead.
- Header: `curl -I https://<dominio>/` mostra `Strict-Transport-Security` e `X-Frame-Options`.

## Rollback

- App: Vercel → Deployments → *Promote* del deploy precedente.
- DB: le migrazioni sono additive; per errori di dati usare il *point-in-time restore* di Neon (branch dal momento precedente).

## Rotazione segreti

- `JWT_SECRET`: cambiarlo invalida tutte le sessioni (tutti rifanno login). Nessuna perdita di dati.
- `CREDENTIALS_KEY`: **non** cambiarla senza ricifrare la tabella `credentials` (script da scrivere quando servirà).

Pagine correlate: [[runbooks/local-development.md|sviluppo locale]], [[architecture/system-architecture.md|architettura]].
