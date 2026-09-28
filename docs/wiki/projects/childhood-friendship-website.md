---
title: Childhood Friendship website
created: 2026-09-28
updated: 2026-09-28
type: project
tags: [project, deployment, integration]
project: childhood-friendship-website
status: active
confidence: high
sources: [package.json, angular.json, src/main.ts, src/app/app.routes.ts, src/index.html, IDEA.md]
---

# Childhood Friendship website

## Scopo

È una landing page Angular per presentare Childhood Friendship come studio software indipendente. Espone servizi per siti web, web app e app mobile, un listino iniziale, il metodo di lavoro e un form per richieste di contatto.

## Repository e comandi

- Repository root: `.`
- Branch osservato: `main`
- Versione package: `0.1.0`
- Installazione: `npm ci`
- Avvio locale: `npm start`
- Build: `npm run build`
- Test dichiarato: `npm run test` (attualmente bloccato dalla sintassi degli argomenti)
- Lint dichiarato: `npm run lint` (attualmente senza target configurato)

## Forma del sistema

- Entry point browser: `src/main.ts`.
- Bootstrap standalone con `provideRouter`.
- Route vuota lazy-loaded verso `LandingPageComponent`; ogni altro percorso redirige a quella route.
- La landing compone nove componenti di sezione sotto `src/app/landing-page/`.
- Three.js è usato nell'hero; Signals gestiscono stato locale dell'hero, del listino e del form.
- Il form usa un endpoint Formspree letto da `src/environments/environment.ts`; il valore non va copiato nella wiki.

Vedere [[../architecture/system-architecture.md|architettura]] e [[../modules/application-modules.md|moduli applicativi]].

## Sviluppo locale

1. Installare le dipendenze bloccate con `npm ci`.
2. Verificare `git status --short --branch`.
3. Avviare con `npm start`.
4. Eseguire build e controlli disponibili prima dell'handoff.
5. Usare un invio di test controllato per verificare Formspree, senza registrare dati personali o segreti.

Vedere [[../runbooks/local-development.md|runbook di sviluppo locale]].

## Deployment e operatività

Il repository contiene la configurazione Angular di build production e l'output sotto `dist/` viene generato dal build. Non sono documentati in questo repository provider di hosting, pipeline di deployment, health check o rollback.

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
