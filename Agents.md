# Agents.md — Childhood Friendship

## Scopo

Questo file contiene le istruzioni operative per qualsiasi IA o sviluppatore che modifichi il repository di **Childhood Friendship**.

## Fonte di verità obbligatoria

La fonte di verità per regole, contesto, decisioni architetturali e stato del progetto è la cartella:

`doc/wiki/`

Prima di modificare il codice è obbligatorio consultare:

- [`doc/wiki/SCHEMA.md`](doc/wiki/SCHEMA.md)
- [`doc/wiki/agent-guide.md`](doc/wiki/agent-guide.md)
- [`doc/wiki/current-status.md`](doc/wiki/current-status.md)

In caso di conflitto, la documentazione aggiornata nella wiki prevale sulle supposizioni personali. Se una decisione è ambigua o non documentata, fermarsi e chiedere chiarimenti prima di procedere.

## Regole operative

1. Leggere la wiki prima di iniziare qualsiasi attività di sviluppo.
2. Usare Angular 22 con architettura basata su Standalone Components.
3. Usare le Signal native di Angular per la gestione dello stato reattivo.
4. Preferire il lazy loading per feature e pagine non necessarie al bootstrap iniziale.
5. Mantenere TypeScript rigorosamente tipizzato.
6. Non introdurre librerie o dipendenze esterne non autorizzate.
7. Non modificare configurazioni core, toolchain o pattern architetturali senza richiesta esplicita.
8. Mantenere modifiche piccole, leggibili, verificabili e coerenti con il codice esistente.
9. Non usare `any` per aggirare errori di tipizzazione.
10. Preservare accessibilità, responsive design, performance e coerenza visiva.
11. Dopo ogni modifica significativa, refactoring o funzionalità completata, aggiornare la wiki.
12. Prima di dichiarare conclusa un’attività, eseguire le verifiche disponibili e riportarne l’esito.

## Processo di aggiornamento della wiki

La wiki deve essere aggiornata quando viene:

- aggiunta una funzionalità;
- completato o modificato un milestone;
- introdotta una decisione architetturale;
- eseguito un refactoring significativo;
- aggiunta una nuova dipendenza o integrazione;
- modificata una regola di progetto;
- individuata una limitazione o un vincolo tecnico.

Aggiornare almeno uno dei seguenti file quando necessario:

- `doc/wiki/agent-guide.md`
- `doc/wiki/current-status.md`
- `doc/wiki/SCHEMA.md`
- `doc/wiki/log.md`

## Identità del progetto

- Nome: **Childhood Friendship**
- Slogan: **“Codice su misura, radici solide”**
- Servizi: siti web, web app e applicazioni per smartphone.
- Posizionamento: soluzioni software su misura, rapide da consegnare e con prezzi competitivi.
- Tono: professionale, rigoroso, affidabile e aziendale.
- Direzione visiva: palette scura basata su nero e viola, con estetica elegante, moderna e orientata al tech.
- Valori distintivi: radici umane, amicizia, lealtà, solidità tecnica e affidabilità.

## Vincoli architetturali principali

- Standalone Components come standard.
- Signal native per lo stato reattivo.
- Lazy loading
