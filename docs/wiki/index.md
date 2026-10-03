# Indice della wiki del progetto

> Catalogo della conoscenza del progetto. Inizia da qui. Ultimo aggiornamento: 2026-10-03 | Pagine: 16

## Progetto

- [[projects/childhood-friendship-website.md|Childhood Friendship website]] — scopo, comandi, forma del sistema, vincoli ed evidenze.

## Architettura

- [[architecture/system-architecture.md|Architettura di sistema]] — bootstrap Angular, routing, lazy loading, composizione della landing e confini delle integrazioni.

## Moduli

- [[modules/api-backend.md|API backend]] — endpoint, ruoli, AI.
- [[modules/admin-portal.md|Area admin e portale]] — struttura frontend, rotte, flusso documenti.

- [[modules/application-modules.md|Moduli applicativi]] — struttura della landing, stato locale, form di contatto e dipendenze condivise.
- [[modules/component-catalog.md|Catalogo componenti]] — responsabilità dei componenti e fonti nel codice.
- [[pricing.md|Offerta e listino]] — contenuti commerciali effettivamente esposti dalla pagina corrente.

## Decisioni

- [[decisions/adr-001-piattaforma.md|ADR-001 — Piattaforma unica]] — monorepo Angular + Express/Postgres, consolidamento delle tre bozze.

## Workflow e runbook

- [[runbooks/local-development.md|Sviluppo locale]] — avvio web + API con PGlite, verifiche, migrazioni.
- [[runbooks/deploy-production.md|Deploy produzione]] — Vercel, Neon, segreti, CI, rollback.

## Bug e debugging

_Nessuna diagnosi durevole ancora presente. Creare una pagina da `templates/bug.md` solo dopo aver identificato causa e verifica._

## Guida e stato

- [[agent-guide.md|Guida per gli agenti]] — accordo operativo per modifiche sicure e verificabili.
- [[current-status.md|Stato corrente]] — snapshot datato delle verifiche e dei gap.
- [[milestones.md|Milestone]] — avanzamento per obiettivi.
- [[boundaries.md|Confini operativi]] — regole di sicurezza e architettura non negoziabili.
- [[best-practices.md|Best practice]] — convenzioni API e web.
- [[token-usage.md|Uso efficiente del contesto]] — regole per indagini e handoff.

## Modelli e pagine vuote

- `templates/` — modelli per progetto, architettura, modulo, runbook, ADR e bug.
