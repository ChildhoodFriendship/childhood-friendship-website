# Log della wiki del progetto

> Append-only. Formato: `## [YYYY-MM-DD] action | subject`  
> Azioni: create, update, verify, archive, lint, query.

## [2026-10-06] create | Wiki Childhood Friendship

- Ricostruita la wiki compatta sotto `docs/wiki/` usando la wiki di riferimento solo per struttura, convenzioni e regole.
- Sostituiti nomi, percorsi, architetture e procedure del progetto di riferimento con evidenze del monorepo corrente.
- Mantenute le regole su orientamento, fonti di verità, confidence, sicurezza, modifica minima, verifica, realtime futuro, handoff e manutenzione documentale.
- Eliminati i percorsi precedenti `doc/wiki/` e `docs/wiki_example/`; rimosso il file `ai wiki adaptation.txt`.

## Decisioni architetturali correnti

- Monorepo npm unico con Angular web, Express API e pacchetto shared.
- Admin e portale cliente restano feature lazy della stessa applicazione Angular.
- Database relazionale con Drizzle; PGlite per sviluppo/test locale e PostgreSQL per produzione prevista.
- Inviti, RBAC, CSRF, credenziali cifrate, audit e migrazioni versionate sono vincoli di sicurezza.

## [2026-10-06] verify | Migrazione documentale

- `npm run check`: passato.
- `npm run test`: 26/26 test passati.
- `npm run build`: passato per web e API.
- Smoke test browser: non ripetuto perché la modifica è documentale.
