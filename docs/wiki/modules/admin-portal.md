---
title: Area admin e portale clienti
created: 2026-10-03
updated: 2026-10-03
type: module
tags: [module, architecture]
project: childhood-friendship-website
status: active
confidence: high
sources: [apps/web/src/app/features, apps/web/src/app/core, apps/web/src/app/shared]
---

# Area admin e portale clienti

## Struttura

| Percorso | Contenuto |
|---|---|
| `core/` | `Api` (HTTP → Promise + `ApiError`), `AuthService` (sessione in Signal, refresh silenzioso), `authInterceptor`, guard per ruolo, toast |
| `shared/` | badge, modale `<dialog>`, conferme, renderer Markdown sicuro, thread messaggi, vista documento, etichette/colori stati |
| `features/auth` | login, attivazione invito |
| `features/admin` | shell con sidebar, dashboard, progetti (+ schede), clienti, lead, utenti, registro |
| `features/portal` | elenco progetti, progetto (fasi, documenti, messaggi, appuntamenti), revisione documento |

## Rotte

- `/login`, `/invito/:token` — pubbliche (login redirige alla propria area se già autenticati).
- `/admin/**` — admin e staff (`utenti`, `log` solo admin).
- `/admin/progetti/:id/{,checklist,documenti,documenti/:docId,marketing,messaggi,accessi}` — stato condiviso in `ProjectStore`.
- `/portale/**` — solo clienti; con un solo progetto si apre direttamente il dettaglio.

## Flusso documento

```mermaid
stateDiagram-v2
  [*] --> bozza
  bozza --> in_revisione: Invia al cliente
  in_revisione --> approvato: cliente approva / team registra ok
  in_revisione --> modifiche_richieste: cliente commenta
  modifiche_richieste --> bozza: team modifica
  approvato --> bozza: modifica contenuto (nuova versione)
```

L'approvazione completa automaticamente il task collegato in checklist. Export PDF = stampa del browser con stile dedicato.

Pagine correlate: [[modules/api-backend.md|API]], [[modules/application-modules.md|moduli landing]].
