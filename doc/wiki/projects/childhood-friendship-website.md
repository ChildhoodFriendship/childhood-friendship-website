# Childhood Friendship

## Scopo

Piattaforma software di Childhood Friendship: sito pubblico commerciale, area admin per clienti/progetti/documenti/marketing e portale clienti. Il form pubblico alimenta i lead interni.

## Configurazione

| Area | Configurazione |
|---|---|
| Workspace | npm workspaces `apps/*`, `packages/*` |
| Web | `apps/web`, Angular standalone; dev `npm run dev:web` |
| API | `apps/api`, Express/Drizzle; dev `npm run dev:api` |
| Shared | `packages/shared` per tipi, catalogo e schemi |
| Locale | Node ≥22, PGlite in `apps/api/.data`, proxy web → API |
| Produzione prevista | Vercel + Postgres/Neon |

Comandi principali: `npm run check`, `npm run test`, `npm run build`, `npm run db:generate`, `npm run db:migrate`, `npm run admin:create`.

## Route e integrazioni

- `/`: landing con form lead, portfolio e scena 3D.
- `/login`, `/invito/:token`: autenticazione e inviti.
- `/admin/**`: area team/admin.
- `/portale/**`: area clienti.
- `/caveau`: ambiente 3D separato.
- `POST /api/public/leads`: endpoint pubblico del form.
- Le altre API sono autenticate; le mutazioni usano CSRF.
- Provider AI configurabile (Gemini o compatibile OpenAI); non salvare chiavi nella wiki.

## Flusso locale minimo

1. `npm ci`.
2. Copiare `apps/api/.env.example` in `.env` e compilare i segreti localmente.
3. Avviare API e web con gli script workspace.
4. Eseguire check, test e build prima dell'handoff.
5. Per lo schema: modificare `apps/api/src/db/schema.ts`, generare una migrazione e verificarla.

## Peculiarità

- Il client non vede credenziali, marketing, versioni documento, documenti non pubblici o audit.
- Il documento usa versioning ottimistico e approvazione cliente.
- Gli account nascono da invito; l'admin si crea solo da CLI.
- Hosting, dominio, cloud e infrastruttura non sono dati da hardcodare nel frontend o nella wiki.
- La build non sostituisce verifica browser, mobile, accessibilità o provider esterni.
