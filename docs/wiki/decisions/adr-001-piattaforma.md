---
title: ADR-001 — Piattaforma unica Angular + Express/Postgres
created: 2026-10-03
updated: 2026-10-03
type: decision
tags: [decision, architecture, database, security]
project: childhood-friendship-website
status: active
confidence: high
sources: [apps/api, apps/web, packages/shared]
---

# ADR-001 — Piattaforma unica Angular + Express/Postgres

## Status

Accepted (2026-10-03)

## Context

Esistevano tre bozze: questa landing Angular, `EliteWebAgency` (React + Express + Drizzle/Neon, con auth reale ma endpoint pericolosi, JSON non strutturati e credenziali in chiaro) ed `elitespaceweb` (Next.js + Genkit, dominio ricco ma dati solo in memoria).

## Decision

- Un monorepo npm workspaces: `apps/web` (Angular 22), `apps/api` (Express 5 + Drizzle), `packages/shared`.
- Backend ripreso da EliteWebAgency e riscritto: Postgres relazionale, sessioni con refresh ruotato, inviti al posto della registrazione, RBAC per cliente, credenziali cifrate, audit.
- Dominio e prompt AI portati da elitespaceweb (22 documenti, marketing, SWOT/PESTEL) su provider AI intercambiabile.
- Admin e portale dentro l'app Angular esistente (lazy routes), un solo deploy Vercel.
- Escluso dalla v1: tariffe, abbonamenti, cashflow.

## Alternatives considered

- Firebase/Firestore (come elitespaceweb): meno server da gestire, ma dati relazionali (clienti → progetti → documenti → versioni) e regole di sicurezza più fragili.
- NestJS: più struttura, ma riscrittura totale senza beneficio immediato.
- Admin come app separata: deploy e sessioni duplicati.

## Consequences

### Positive

- Tipi e validazioni condivise tra frontend e backend.
- Test di integrazione veloci su PGlite, senza Postgres locale.

### Negative

- Il frontend React di EliteWebAgency e il Next.js di elitespaceweb vengono dismessi.
- Rate limit in memoria: su Vercel è per istanza (accettabile con il traffico attuale; passare a Redis/Upstash se cresce).

## Verification / revisit trigger

Rivedere se il numero di clienti attivi supera ~50 o se servono notifiche realtime.

## Related pages

- [[architecture/system-architecture.md|Architettura]]
- [[boundaries.md|Confini]]
