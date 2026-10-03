# Childhood Friendship

> Codice su misura, radici solide.

Monorepo con sito pubblico, area admin per la gestione dei progetti e portale clienti.

| Cartella | Contenuto |
|---|---|
| `apps/web` | Angular 22: landing (`/`), area admin (`/admin`), portale clienti (`/portale`) |
| `apps/api` | API Express 5 + Drizzle ORM su Postgres (Neon) — auth, progetti, documenti, marketing, AI |
| `packages/shared` | Catalogo del dominio, schemi Zod e DTO condivisi |
| `docs/wiki` | Fonte di verità per regole, architettura, decisioni e stato (vedi `Agents.md`) |

## Avvio rapido

```bash
npm ci
cp apps/api/.env.example apps/api/.env        # compila JWT_SECRET e CREDENTIALS_KEY (istruzioni nel file)
npm run admin:create -- --email tu@dominio.it --name "Il tuo nome"
npm run dev:api                                 # http://localhost:3000 (PGlite locale, nessun Postgres richiesto)
npm run dev:web                                 # http://localhost:4200 (proxy /api → :3000)
```

Accedi da `http://localhost:4200/login`. I clienti e i colleghi entrano solo tramite **invito** (Admin → Utenti e inviti, oppure Clienti → Invita al portale).

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run check` | Type-check di shared, API e web (build Angular di sviluppo) |
| `npm test` | Test di integrazione API (Vitest + Supertest su PGlite in memoria) |
| `npm run build` | Build produzione web + bundle API |
| `npm run db:generate` | Genera una nuova migrazione dopo modifiche a `apps/api/src/db/schema.ts` |
| `npm run db:migrate` | Applica le migrazioni al `DATABASE_URL` configurato |

Deploy, variabili d'ambiente e procedure operative: `docs/wiki/runbooks/deploy-production.md`.
