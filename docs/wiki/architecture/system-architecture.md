---
title: Architettura di sistema — Childhood Friendship website
created: 2026-09-28
updated: 2026-09-28
type: architecture
tags: [architecture, integration, security, performance]
project: childhood-friendship-website
status: active
confidence: high
sources: [src/main.ts, src/app/app.config.ts, src/app/app.routes.ts, src/app/app.component.ts, src/app/landing-page/landing-page.component.ts, src/app/landing-page/hero/hero-section.component.ts, src/app/landing-page/contact/contact-section.component.ts, src/environments/environment.ts, angular.json]
---

# Architettura di sistema

## Contesto

Il progetto è una singola applicazione browser Angular 22, standalone, che presenta una landing marketing. Non risultano backend applicativo o database nel repository; il solo servizio esterno osservabile è l'endpoint Formspree per il form.

## Componenti

| Componente | Responsabilità | Evidenza |
|---|---|---|
| Bootstrap | Crea l'app standalone e gestisce errori di bootstrap | `src/main.ts` |
| Router | Lazy-load della landing e redirect wildcard | `src/app/app.routes.ts` |
| Root | Espone `router-outlet` con OnPush | `src/app/app.component.ts` |
| Landing shell | Ordina header, sezioni e footer | `src/app/landing-page/landing-page.component.*` |
| Hero | Canvas Three.js, segnali di stato e modale progetto | `src/app/landing-page/hero/hero-section.component.*` |
| Pricing | Alterna viste sviluppo/manutenzione e piani tipizzati | `src/app/landing-page/pricing/*` |
| Contact | Invia FormData via `fetch` e mostra stato del submit | `src/app/landing-page/contact/*` |
| Stili globali | Palette, font, focus visible e base responsive | `src/styles.css` |

## Flusso runtime

1. `main.ts` esegue `bootstrapApplication` con `appConfig`.
2. `appConfig` registra il router.
3. La route vuota carica `LandingPageComponent` tramite `loadComponent`.
4. Il componente landing renderizza le sezioni standalone in ordine.
5. L'hero inizializza l'interazione Three.js nel canvas; gli eventi aggiornano Signals e modale.
6. Il listino cambia vista aggiornando `activeView`.
7. Il form costruisce `FormData`, esegue POST verso l'endpoint configurato e aggiorna `submissionState`.

## Confini dati e controllo

- **Routing:** il router controlla l'accesso alla sola pagina presente; non esiste guard di autenticazione.
- **Stato UI:** ogni sezione possiede lo stato strettamente necessario; non esiste uno store globale osservato.
- **Rendering 3D:** Three.js resta confinato all'hero e alle sue referenze canvas.
- **Contatto:** il browser invia i dati direttamente al servizio esterno; il repository non contiene un proxy o un backend.
- **Configurazione:** l'environment fornisce il valore dell'endpoint; non documentare il valore concreto.
- **Stili:** `src/styles.css` definisce fondazioni globali, mentre ogni sezione mantiene il proprio CSS.

## Failure modes

- Un errore nel bootstrap viene scritto in console.
- Un errore di rete o una risposta non OK del form porta lo stato a `error`.
- Un percorso sconosciuto viene reindirizzato alla landing.
- Un build riuscito non dimostra che canvas, viewport, Formspree o accessibilità funzionino in un browser reale.

## Confini di sicurezza

- Non registrare endpoint sensibili, dati del form, token o credenziali nella wiki o nei log.
- Mantenere il campo honeypot e la validazione HTML del form salvo decisione esplicita.
- Trattare il servizio esterno come dipendenza runtime non verificata dal solo build.

Pagine correlate: [[../projects/childhood-friendship-website.md|progetto]], [[../modules/application-modules.md|moduli]], [[../runbooks/local-development.md|runbook]] e [[../current-status.md|stato]].
