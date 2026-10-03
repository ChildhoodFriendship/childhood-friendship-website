---
title: Architettura di sistema — Childhood Friendship
created: 2026-09-28
updated: 2026-10-03
type: architecture
tags: [architecture, security, database, integration]
project: childhood-friendship-website
status: active
confidence: high
sources: [package.json, apps/api/src/app.ts, apps/api/src/db/schema.ts, apps/web/src/app/app.routes.ts, vercel.json]
---

# Architettura di sistema

## Vista d'insieme

```mermaid
flowchart LR
  subgraph Browser
    L[Landing /] -->|form contatti| P1
    A[Admin /admin] --> P2
    C[Portale /portale] --> P2
  end
  subgraph Vercel
    S[Static Angular] 
    F[Function /api → Express]
  end
  P1[POST /api/public/leads] --> F
  P2[/api/* cookie + CSRF/] --> F
  F --> DB[(Postgres Neon)]
  F --> AI[Gemini / OpenAI-compatible]
```

Stesso dominio per sito e API: i cookie di sessione restano first-party (`SameSite=Lax/Strict`, `HttpOnly`, `Secure` in produzione).

## Componenti

| Componente | Responsabilità | Sorgente |
|---|---|---|
| `packages/shared` | Catalogo dominio (22 tipi documento, fasi, stati), schemi Zod, DTO | `catalog.ts`, `schemas.ts`, `types.ts` |
| API Express | Middleware sicurezza, auth, moduli di dominio | `apps/api/src/app.ts` |
| DB | 18 tabelle Drizzle, migrazioni versionate | `apps/api/src/db/schema.ts`, `apps/api/drizzle/` |
| Web | Landing, admin, portale (lazy routes per area) | `apps/web/src/app` |

## Pipeline di una richiesta API

1. `helmet` → JSON (limite 1 MB) → cookie → rate limit globale (300/min/IP).
2. `csrf` double-submit (`XSRF-TOKEN` / `X-XSRF-TOKEN`), escluso `/api/public/*`.
3. `authenticate`: verifica JWT di accesso (15 min) + sessione non revocata + utente attivo → `req.user`.
4. `requireAuth` / `requireRole` / `projectScope` (isolamento per cliente).
5. Validazione Zod → logica → `audit()` → `serialize()`.
6. `errorHandler`: errori uniformi `{ error: { code, message, details } }`.

## Modello dati

```mermaid
erDiagram
  clients ||--o{ projects : ha
  clients ||--o{ users : "utenti cliente"
  projects ||--o{ tasks : checklist
  projects ||--o{ documents : documenti
  documents ||--o{ document_versions : versioni
  projects ||--o{ messages : messaggi
  projects ||--o{ credentials : "accessi cifrati"
  projects ||--o{ appointments : appuntamenti
  projects ||--o{ marketing_platforms : piattaforme
  projects ||--o{ marketing_campaigns : campagne
  projects ||--o{ marketing_contents : calendario
  projects ||--o{ marketing_analyses : analisi
  users ||--o{ sessions : "refresh token"
  leads }o--|| clients : "conversione"
```

## Autenticazione

- Login → access JWT (cookie `cf_at`, path `/api`, 15 min) + refresh opaco (cookie `cf_rt`, path `/api/auth`, 14 giorni, solo hash nel DB).
- Refresh ruotato a ogni uso; il riuso di un token già ruotato revoca tutte le sessioni dell'utente.
- 5 password errate → blocco 15 minuti. Password: scrypt (N=2^15).
- Disattivare un utente o cambiarne il ruolo revoca subito le sue sessioni.

## Ruoli

| Ruolo | Può |
|---|---|
| admin | Tutto, inclusi utenti/inviti, registro attività, rivelare credenziali, eliminare |
| staff | Gestire clienti, progetti, documenti, marketing, lead, credenziali (senza rivelarle) |
| client | Vedere i progetti del proprio cliente, documenti visibili, approvare/richiedere modifiche, messaggi |

Pagine correlate: [[modules/api-backend.md|API]], [[modules/admin-portal.md|admin e portale]], [[boundaries.md|confini]], [[decisions/adr-001-piattaforma.md|ADR-001]].
