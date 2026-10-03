---
title: API backend
created: 2026-10-03
updated: 2026-10-03
type: api
tags: [api, module, security]
project: childhood-friendship-website
status: active
confidence: high
sources: [apps/api/src/app.ts, apps/api/src/modules]
---

# API backend (`/api`)

Tutte le rotte (tranne `health`, `public/*`, `auth/*`) richiedono sessione. Le mutazioni richiedono l'header CSRF.

| Area | Endpoint | Ruoli |
|---|---|---|
| Health | `GET /health` | pubblico |
| Lead sito | `POST /public/leads` (honeypot `website`, 5/h per IP) | pubblico |
| Auth | `GET /auth/csrf`, `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `GET /auth/me`, `GET /auth/invite/:token`, `POST /auth/invite/accept`, `POST /auth/password` | — |
| Dashboard | `GET /dashboard` | team |
| Utenti | `GET /users`, `PATCH /users/:id`, `GET/POST /users/invites`, `DELETE /users/invites/:id` | team (lettura) / admin |
| Clienti | `GET/POST /clients`, `GET/PATCH /clients/:id`, `DELETE` (admin, senza progetti) | team |
| Progetti | `GET/POST /projects`, `GET/PATCH /projects/:id`, `POST …/archive`, `…/restore`, `DELETE` (admin, solo archiviati) | lettura anche cliente |
| Task | `GET/POST …/tasks`, `POST …/tasks/reorder`, `PATCH/DELETE …/tasks/:id` | lettura anche cliente |
| Documenti | `GET/POST …/documents`, `GET/PATCH …/documents/:id` (con `baseVersion`), `POST …/submit`, `POST …/review`, `GET …/versions[/:v]` | review: cliente o team |
| Messaggi | `GET/POST …/messages` (`?before=ISO`) | tutti i membri del progetto |
| Credenziali | `GET/POST …/credentials`, `PATCH/DELETE …/:id`, `POST …/:id/reveal` (admin) | team |
| Appuntamenti | `GET/POST …/appointments`, `PATCH/DELETE …/:id` | lettura anche cliente |
| Marketing | `…/marketing/{platforms,contents,campaigns,analyses}` CRUD, `GET …/marketing/summary` | team |
| AI | `POST …/ai/documents/:id`, `…/ai/suggestions`, `…/ai/swot`, `…/ai/pestel`, `…/ai/campaigns/:id/post-idea`, `…/ai/tasks/:id/due-date`, `GET /ai/usage` | team, quota giornaliera |
| Lead | `GET /leads`, `PATCH /leads/:id`, `POST /leads/:id/convert`, `DELETE` (admin) | team |
| Audit | `GET /audit` | admin |

`…` = `/projects/:projectId`. Un progetto non accessibile risponde **404** (non 403) per non rivelarne l'esistenza.

## AI

- Provider: `AI_PROVIDER=gemini` (REST `generateContent`) o `openai-compatible` (Groq, OpenRouter).
- I dati del progetto sono racchiusi in `<dati>…</dati>` e il prompt di sistema vieta di eseguire istruzioni al loro interno.
- Le bozze di documento non vengono salvate automaticamente; SWOT/PESTEL/suggerimenti vengono salvati in `marketing_analyses`.
- Quota: `AI_DAILY_LIMIT` richieste per utente al giorno (tabella `ai_usage`).

Pagine correlate: [[architecture/system-architecture.md|architettura]], [[boundaries.md|confini]].
