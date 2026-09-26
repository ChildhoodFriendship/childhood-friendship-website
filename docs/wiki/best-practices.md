# Best Practices — Childhood Friendship

## Obiettivo

Queste regole definiscono il modo standard di progettare e implementare il progetto Angular 22. La priorità è mantenere una base rapida da evolvere, leggibile e solida.

## Angular 22 — radici solide

- Usare **Standalone Components** come standard assoluto: ogni componente, direttiva e pipe deve essere standalone e autocontenuto; non introdurre `NgModule`.
- Organizzare ogni sezione significativa della landing come componente standalone dentro la propria cartella feature, con file affiancati `.ts`, `.html` e `.css`.
- Usare esclusivamente CSS nativo per gli stili del progetto; non introdurre file `.scss` o dipendenze Sass.
- Preferire componenti piccoli, con una responsabilità chiara e dipendenze esplicite nell’array `imports`.
- Usare `ChangeDetectionStrategy.OnPush` nei componenti applicativi.
- Preferire la sintassi moderna dei template (`@if`, `@for`, `@switch`) e fornire sempre una `track` stabile nei cicli.
- Applicare lazy loading a ogni rotta e macro-feature: usare `loadComponent` o `loadChildren` per caricare il codice in modo asincrono.
- Evitare logica di business complessa nei template; spostarla in componenti, servizi o funzioni pure.

## Design System & UI Tokens

I token sono l’unica fonte autorizzata per i valori visuali ricorrenti. Non inventare colori ad hoc nei componenti.

### Palette ufficiale

| Token | HEX | Uso |
|---|---|---|
| `--cf-color-black` | `#0A0A0A` | Sfondo profondo dell’applicazione |
| `--cf-color-surface` | `#171717` | Card, pannelli e superfici principali |
| `--cf-color-surface-raised` | `#262626` | Superfici rialzate e hover |
| `--cf-color-violet` | `#7C3AED` | Azioni primarie e dettagli brand |
| `--cf-color-violet-light` | `#8B5CF6` | Hover, focus e accenti luminosi |
| `--cf-color-text` | `#F5F5F5` | Testo principale |
| `--cf-color-text-muted` | `#A3A3A3` | Testo secondario e descrizioni |
| `--cf-color-border` | `#3F3F46` | Bordi e separatori |
| `--cf-color-danger` | `#F87171` | Errori e azioni distruttive |
| `--cf-color-success` | `#4ADE80` | Conferme e stati positivi |

### Tipografia e accessibilità

- Il testo chiaro su sfondo scuro deve rispettare WCAG 2.2 AA: contrasto minimo 4.5:1 per testo normale e 3:1 per testo grande.
- Il contrasto dei componenti interattivi, degli stati focus e degli elementi non testuali deve essere verificato, non assunto.
- Usare gerarchie tipografiche coerenti, line-height leggibile e focus visibile.
- Non usare il colore come unico mezzo per comunicare stato o errore.

### UI Kit interno

- I componenti riutilizzabili vivono in `shared/components/` e devono avere API tipizzate, input/output chiari e responsabilità singola.
- Bottoni, card, modali, input e pattern ricorrenti devono essere progettati come componenti autonomi, accessibili e privi di logica di dominio.
- Il componente condiviso deve essere configurabile tramite input espliciti, non tramite selettori CSS o stato globale implicito.
- Prima di aggiungere un componente al UI Kit, verificare che il riuso sia reale e documentare varianti, stati e vincoli di accessibilità.
- Il UI Kit deve rimanere indipendente dalle feature di business per poter essere riutilizzato in progetti futuri.

## Signal e stato

- Usare `signal()` per lo stato locale mutabile, `computed()` per valori derivati e `effect()` solo per effetti collaterali reali.
- Mantenere lo stato il più vicino possibile alla feature che lo possiede.
- Non usare `effect()` per sincronizzare valori derivabili: preferire `computed()`.
- Esporre stato in sola lettura quando possibile tramite `asReadonly()` o API equivalenti.
- Incapsulare lo stato condiviso in servizi focalizzati; evitare un singleton globale come contenitore indistinto.
- Per flussi asincroni, definire esplicitamente loading, success ed error invece di lasciare stati impliciti.

## TypeScript rigoroso

- Mantenere strict mode attivo e non usare `any` salvo eccezione motivata e documentata.
- Preferire `unknown` a `any` nei dati esterni e validare prima dell’uso.
- Definire tipi per input, output, stato, payload API ed errori significativi.
- Usare `interface` per contratti estendibili e `type` per unioni, alias e composizioni.
- Evitare non-null assertion (`!`) e cast (`as`) quando una guardia o un tipo migliore risolve il problema.
- Rendere espliciti i ritorni delle funzioni pubbliche e mantenere le funzioni pure quando possibile.

## Naming e struttura

- File e cartelle in `kebab-case`; componenti e classi in `PascalCase`; variabili e funzioni in `camelCase`.
- I nomi devono descrivere il dominio, non l’implementazione tecnica.
- Organizzare il codice per feature, separando UI, stato, servizi, modelli e utilità solo quando la complessità lo giustifica.
- Evitare file generici come `utils.ts`, `helpers.ts` o `common.ts` senza un perimetro chiaro.
- Preferire API pubbliche minime e dipendenze unidirezionali tra feature.

## UI e identità

- Preservare il dualismo del brand: interfacce scure, eleganti e tech, con copy professionale e affidabile.
- Centralizzare token visivi e decisioni di design; non duplicare valori arbitrari nei componenti.
- Garantire accessibilità semantica, focus visibile, navigazione da tastiera e contrasto adeguato.

## Performance, SSR e Core Web Vitals

- Ottimizzare le immagini: usare formati moderni quando supportati, dimensioni appropriate, `loading="lazy"` per contenuti fuori viewport e dimensioni esplicite per evitare layout shift.
- Mantenere ridotto il bundle: evitare dipendenze inutili, importare solo ciò che serve e controllare la crescita delle macro-feature lazy-loaded.
- Caricare font con criterio, limitando famiglie e pesi; usare fallback di sistema e prevenire blocchi del rendering.
- Verificare LCP, INP e CLS durante la fase di qualità; nessuna ottimizzazione deve compromettere accessibilità o leggibilità.
- Il codice deve essere compatibile con SSR: non accedere direttamente a `window`, `document`, `navigator` o `localStorage` durante il rendering server-side.
- Per API disponibili solo nel browser usare guardie di piattaforma e iniezione dei token Angular appropriati; inizializzare tali effetti solo nel contesto browser.
- Considerare il ciclo di vita server/client ed evitare effetti non idempotenti durante l’hydration.

## Integrazioni esterne

- Per il form contatti usare Formspree tramite `POST`/AJAX e un endpoint pubblico con il solo form ID; non inserire indirizzi email o credenziali nel frontend.
- Il valore operativo del form è in `src/environments/environment.ts` e viene versionato perché l’endpoint Formspree è un identificativo pubblico, non una credenziale; usare `src/environments/environment.example.ts` come modello per altri ambienti.
- I file di ambiente frontend vengono inclusi nel bundle: non inserirvi password, token segreti o credenziali. Il Form ID Formspree è un identificatore pubblico, non un segreto.
- L’endpoint resta un segnaposto (`REPLACE_WITH_FORM_ID`) nel file di esempio fino alla configurazione da parte del proprietario dell’account.
- Gestire esplicitamente stati di invio, successo ed errore e mantenere la validazione HTML nativa.

## Convenzioni Git

Usare Conventional Commits con formato `<tipo>: <descrizione breve>`.

Tipi ammessi: `feat`, `fix`, `docs`, `refactor`, `test`, `perf`, `build`, `chore`.

Esempi:

- `feat: aggiunta hero section`
- `fix: correzione bug responsive`
- `docs: aggiornamento wiki`
- `perf: ottimizzazione immagini landing`

I commit devono essere piccoli, descrittivi e focalizzati su una sola intenzione.

## Qualità

- Ogni feature deve includere test adeguati al rischio e alla logica introdotta.
- Prima del completamento eseguire almeno build, lint e test disponibili nel progetto.
- Documentare nella wiki le nuove decisioni architetturali o le eccezioni a queste regole.
- **Regola d’oro della wiki:** ogni task chiusa o blocco importante aggiunto richiede l’aggiornamento dello stato attuale nella wiki nella stessa modifica.
