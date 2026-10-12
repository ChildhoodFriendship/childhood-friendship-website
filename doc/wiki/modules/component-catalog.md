# Catalogo componenti, moduli e servizi

Inventario derivato dal codice corrente. La presenza nel repository non equivale a verifica browser o produzione.

## Web: shell e landing

| Elemento | Scopo | Input/output e vincoli |
|---|---|---|
| `AppComponent` | shell root e outlet | bootstrap standalone |
| `LandingPageComponent` | compone le sezioni | layout e ordine della landing |
| `HeaderComponent` / `FooterComponent` | navigazione e chiusura pagina | anchor accessibili |
| `HeroComponent` / `SceneComponent` | hero e scena Three.js | WebGL, cleanup risorse, caricamento differito |
| `ManifestoComponent` / `AboutComponent` | identità e manifesto | contenuto statico; particelle decorative |
| `ServicesComponent` | offerte | array tipizzato readonly |
| `MethodComponent` | processo di lavoro | stato di fase e scena condivisa |
| `PortfolioComponent` | portfolio 3D | Signal/computed, evento `cf:portfolio`, link opzionali |
| `ContactSectionComponent` | raccolta contatti | stato `idle/submitting/success/error`, validazione e API lead |
| `OutroComponent` / `CaveauPage` | finale e ambiente 3D | animazioni, accessibilità, fallback/reduced motion |

## Web: app autenticata

| Modulo | Elementi | Contratto |
|---|---|---|
| `core` | `Api`, `ApiError`, `AuthService`, interceptor, guard, `ToastService` | Promise/HTTP, sessione in Signal, ruoli |
| `shared` | badge, modal, overlay, conferme, Markdown, document view, thread, labels | riuso UI; Markdown sanitizzato; `ConfirmService` |
| `features/auth` | login, invito, password | route pubbliche; sessione e redirect |
| `features/admin` | shell, dashboard, progetti, clienti, lead, utenti, audit, marketing | route `/admin/**`, ruoli team/admin |
| `features/portal` | elenco e dettaglio progetto, documenti, messaggi, appuntamenti | route `/portale/**`, solo cliente |

## API e dominio

| Modulo/servizio | Scopo | Vincoli |
|---|---|---|
| middleware app | helmet, cookie, rate limit, CSRF, auth, ruoli, project scope, error handler | ordine middleware obbligatorio |
| route modules | auth, users, clients, projects, tasks, documents, messages, credentials, appointments, marketing, leads, AI, audit | input Zod; audit sulle mutazioni |
| `SecretBox` | cifra credenziali cliente | AES-256-GCM; reveal solo admin |
| `serialize` / `HttpError` | output e errori uniformi | mai restituire segreti/hash |
| migration/admin scripts | DB e bootstrap admin | CLI, mai DDL via HTTP |

## Shared

- `packages/shared/src/types.ts`: tipi e DTO condivisi.
- `packages/shared/src/catalog.ts`: catalogo documenti, fasi e stati.
- `packages/shared/src/schemas.ts`: schemi Zod per input API.

## Asset e utility 3D

- `builder-scene.ts`, `builder-rig.ts`: scena, rig, pose, IK e animazioni.
- `rig-builder.mjs`, `rig-partner.mjs`: generazione rig dei modelli GLB.
- `particle-text.ts`: testo particellare decorativo.
- `contacts.ts`, `projects.data.ts`, `textures.ts`, `audio.ts`: dati e asset della landing/caveau.

## Vincoli di integrazione

- La scena 3D non deve bloccare contenuto o reduced motion.
- Lo stato locale resta vicino alla feature; niente stato globale senza necessità.
- Le chiamate web usano i servizi core; le conferme non usano API browser native.
- Il browser non importa Zod direttamente: il contratto viene applicato lato API/shared secondo la configurazione workspace.
