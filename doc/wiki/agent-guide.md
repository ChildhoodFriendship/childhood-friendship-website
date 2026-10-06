# Guida operativa per agenti

## Prima di modificare

1. Leggere `SCHEMA.md`, `index.md`, `current-status.md` e le ultime voci di `log.md`.
2. Eseguire `git status --short --branch` e preservare ogni modifica già presente.
3. Cercare definizioni e usi reali nel repository; leggere manifest, configurazione, sorgenti e test pertinenti.
4. Applicare la modifica minima coerente con l'architettura esistente.

## Regole non negoziabili

- Angular 22, standalone components, Signals native e `OnPush`.
- TypeScript rigoroso: non usare `any` per nascondere errori.
- Preferire `loadComponent`/`loadChildren` per pagine o feature non necessarie al bootstrap.
- Validare ogni input API con gli schemi Zod condivisi.
- Non introdurre dipendenze, cambiare toolchain o alterare pattern architetturali senza richiesta esplicita.
- Mantenere accessibilità, responsive design, performance e contenuti in italiano.
- Stato locale con `signal`/`computed`; dati statici tipizzati e readonly.
- API web tramite `Api`; errori mostrati con `ToastService`; conferme con `ConfirmService`, mai `alert`/`window.confirm`.
- Modifiche DB solo con `drizzle-kit generate` e migrazione versionata.
- Documenti con concorrenza ottimistica (`baseVersion`); ogni mutazione sensibile in `audit_log`.
- Nessuna registrazione pubblica: gli account nascono da invito; admin solo via CLI.
- Mai esporre password, hash, chiavi, credenziali cifrate o dati non visibili al cliente.
- Non committare, fare push, reset o riscrivere la storia senza richiesta esplicita.

## Sicurezza e confini

- `/projects/:projectId/*` deve passare dal controllo `projectScope`/`loadProjectFor`.
- I segreti cliente usano `SecretBox` AES-256-GCM; la rivelazione è solo admin e viene auditata.
- Le mutazioni autenticate richiedono CSRF; l'accesso progetto negato risponde 404 per non rivelarne l'esistenza.
- `.env`, credenziali e token restano fuori da codice, wiki e log.

## Verifica

Eseguire separatamente e riportare l'esito reale:

```bash
npm run check
npm run test
npm run build
```

Per modifiche UI eseguire anche uno smoke test del dev server/browser quando disponibile. Un build verde non dimostra rendering, responsive, accessibilità o integrazioni esterne.

## Manutenzione wiki

Dopo una feature, refactoring, decisione, dipendenza o modifica di vincolo:

- aggiornare la pagina coinvolta e `current-status.md` se cambia lo stato;
- aggiornare `index.md` se cambiano file o percorsi;
- aggiungere una voce concisa a `log.md` con verifica e limiti residui;
- dichiarare esplicitamente ciò che non è stato verificato.

## Handoff

Indicare: ambito/file, evidenze e comandi, stato (completato/bloccato/parziale), rischio residuo e prossima azione concreta.
