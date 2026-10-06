---
title: Catalogo componenti e moduli
created: 2026-10-06
updated: 2026-10-06
type: module
tags: [module, architecture, api, integration]
project: childhood-friendship-website
status: active
confidence: high
sources: [apps/web/src/app, apps/api/src, packages/shared/src]
---

# Catalogo componenti e moduli

La presenza nel codice dimostra l'esistenza dell'implementazione, non l'accettazione completa in browser o produzione.

## Web: shell e landing

| Elemento | Responsabilità | Contratto/vincoli |
|---|---|---|
| `AppComponent` | shell root e outlet | standalone |
| `LandingPageComponent` | composizione della landing | sezioni ordinate e lazy route `/` |
| `HeaderComponent` / `FooterComponent` | navigazione e chiusura pagina | link accessibili |
| `HeroComponent` / `SceneComponent` | hero e scena Three.js | WebGL, teardown, reduced motion |
| `ManifestoComponent` / `AboutComponent` | manifesto e posizionamento | contenuto editoriale e particelle decorative |
| `ServicesComponent` | servizi | dati readonly tipizzati |
| `MethodComponent` | processo di lavoro | coordinamento con scena 3D |
| `PortfolioComponent` | portfolio interattivo | Signal/computed, evento `cf:portfolio`, link opzionali |
| `ContactSectionComponent` | acquisizione lead | stati idle/submitting/success/error e endpoint configurato |
| `OutroComponent` / `CaveauPage` | finale e ambiente 3D | animazioni, fallback e accessibilità |

## Web: servizi condivisi e feature autenticate

| Modulo | Elementi | Input/output e vincoli |
|---|---|---|
| `core` | `Api`, `ApiError`, `AuthService`, interceptor, guard, `ToastService` | HTTP Promise, sessione Signal, ruoli |
| `shared` | badge, modal, overlay, conferme, Markdown, document view, thread, labels | riuso UI; Markdown sanitizzato |
| `features/auth` | login e invito | route pubbliche; redirect per sessione |
| `features/admin` | dashboard, clienti, progetti, documenti, lead, utenti, audit, marketing | `/admin/**`; ruoli team/admin |
| `features/portal` | progetti, documenti, messaggi, appuntamenti | `/portale/**`; solo clienti |
| `features/account` | dati dell'account autenticato | accesso protetto |

## API

| Modulo | Responsabilità | Vincoli |
|---|---|---|
| middleware | helmet, cookie, rate limit, CSRF, auth, error handling | ordine e contratti in `apps/api/src/app.ts` |
| auth/users/clients | sessione, inviti, utenti e clienti | RBAC; niente registrazione pubblica |
| projects/tasks | progetti e checklist | `projectScope` per le route annidate |
| documents | contenuti, versioni, review | `baseVersion`, audit e serializzazione |
| messages/appointments | comunicazione e appuntamenti | accesso membri progetto |
| credentials | accessi cliente | cifratura AES-256-GCM; reveal admin |
| marketing | piattaforme, contenuti, campagne, analisi | dati associati al progetto |
| leads | lead pubblici e conversione | endpoint pubblico limitato; gestione autenticata |
| ai | generazione e analisi | provider configurabile e quota giornaliera |
| audit/dashboard | riepiloghi e registro | audit visibile solo ai ruoli autorizzati |

## Shared e utility

- `packages/shared/src/types.ts`: tipi e DTO condivisi.
- `packages/shared/src/catalog.ts`: stati, ruoli, fasi, tipi documento e categorie.
- `packages/shared/src/schemas.ts`: schemi Zod per input API.
- `apps/api/src/lib/validate.ts`, `serialize.ts`, `http-error.ts`, `crypto.ts`, `audit.ts`: confini riutilizzabili dell'API.
- `apps/web/scripts/rig-builder.mjs` e `rig-partner.mjs`: preparazione dei rig 3D.
- `builder-scene.ts`, `builder-rig.ts`, `particle-text.ts`, `contacts.ts` e asset caveau: rendering e contenuti della landing.

## Gap di verifica

- Non risultano test automatici di componente frontend.
- La scena Three.js richiede verifica di teardown, fluidità e reduced motion in browser reali.
- Form, provider AI, deploy e autorizzazioni complete richiedono ambienti esterni configurati.
