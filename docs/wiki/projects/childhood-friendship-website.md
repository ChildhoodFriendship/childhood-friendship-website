---
title: Childhood Friendship website
created: 2026-09-28
updated: 2026-10-03
type: project
tags: [project, deployment, integration]
project: childhood-friendship-website
status: active
confidence: high
sources: [package.json, angular.json, src/main.ts, src/app/app.routes.ts, src/index.html, IDEA.md]
---

# Childhood Friendship website

## Scopo

Piattaforma di Childhood Friendship: landing commerciale, area admin per gestire clienti, progetti, documenti e marketing, portale per i clienti. Il form contatti alimenta i lead interni.

## Repository e comandi

Monorepo npm workspaces (`apps/web`, `apps/api`, `packages/shared`). Comandi in `README.md`; dettagli in [[../runbooks/local-development.md|sviluppo locale]].

## Forma del sistema

Vedi [[../architecture/system-architecture.md|architettura]], [[../modules/api-backend.md|API]], [[../modules/admin-portal.md|admin e portale]] e [[../decisions/adr-001-piattaforma.md|ADR-001]].

## Sviluppo locale

1. Installare le dipendenze bloccate con `npm ci`.
2. Verificare `git status --short --branch`.
3. Avviare con `npm start`.
4. Eseguire build e controlli disponibili prima dell'handoff.
5. Inviare una richiesta di prova dal form e verificarla in Admin → Lead.

Vedere [[../runbooks/local-development.md|runbook di sviluppo locale]].

## Deployment e operatività

Deploy su Vercel (sito statico + function `/api`) con Postgres Neon; procedure in [[../runbooks/deploy-production.md|runbook deploy]].

## Vincoli noti

- Angular 22, standalone components e TypeScript rigorosamente tipizzato sono vincoli del progetto.
- Non aggiungere dipendenze o modificare toolchain senza richiesta esplicita.
- Le informazioni di invio del form sono configurazione runtime e non devono essere trattate come contenuto pubblico della wiki.
- La sola build non prova il corretto rendering browser, il comportamento responsive o l'invio esterno.

## Evidenze

- `package.json`
- `angular.json`
- `src/main.ts`
- `src/app/app.routes.ts`
- `src/app/landing-page/landing-page.component.html`
- `src/environments/environment.example.ts`
- `src/index.html`

Pagine correlate: [[../current-status.md|stato corrente]], [[../architecture/system-architecture.md|architettura]] e [[../runbooks/local-development.md|sviluppo locale]].
