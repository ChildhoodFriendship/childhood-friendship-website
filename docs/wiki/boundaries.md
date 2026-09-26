# Boundaries — Confini e Limitazioni

Questi confini sono vincolanti per IA e sviluppatori. Un’eccezione richiede approvazione esplicita e aggiornamento di questa pagina.

## Architettura

- Usare Angular 22 come framework applicativo di riferimento.
- Usare Standalone Components senza eccezioni: non reintrodurre `NgModule`.
- Usare Signal native (`signal`, `computed`, `effect`) per lo stato locale; non usare RxJS come pattern di state management locale quando una Signal è sufficiente.
- Usare lazy loading per ogni rotta e macro-feature tramite caricamento asincrono.
- Mantenere separazione chiara tra shell, feature, UI condivisa, servizi e modelli.
- I componenti UI riutilizzabili appartengono a `shared/components/` e non possono contenere logica di dominio.
- Non introdurre microfrontend, event bus globale o pattern CQRS/state management complessi senza decisione architetturale documentata.

## Dipendenze e configurazione

- Non introdurre librerie esterne non autorizzate.
- Preferire API native di Angular e della piattaforma browser quando sufficienti.
- Non modificare `angular.json`, `package.json`, `tsconfig*`, configurazioni di build, lint o test senza richiesta esplicita o decisione documentata.
- Non aggiornare versioni, sostituire toolchain o aggiungere script globali come parte di una feature ordinaria.
- Non modificare segreti, environment sensibili o pipeline di deployment.
- Non eseguire comandi inerenti a git

## Codice

- Non usare `any` per aggirare errori di tipizzazione.
- Non introdurre stato globale, singleton generici o variabili mutabili condivise senza una motivazione documentata.
- Non inserire logica di dominio nei template o nel layer di presentazione se appartiene a un servizio/use case.
- Non copiare codice per evitare di chiarire ownership e riuso; estrarre solo astrazioni con responsabilità reale.
- Non rimuovere test, controlli di qualità o accessibilità per far passare una build.

## UI e brand

- Mantenere palette scura basata su nero e viola, usando esclusivamente i token ufficiali documentati in `best-practices.md`.
- Il copy deve restare professionale e aziendale; il calore umano è un elemento distintivo, non un motivo per ridurre precisione o chiarezza.
- Non aggiungere colori, font o componenti visuali globali senza registrarne la decisione nei token/design docs.
- Il testo e gli stati interattivi devono rispettare i requisiti WCAG 2.2 AA di contrasto e focus.
- Accessibilità, responsive design e performance sono requisiti, non attività opzionali di rifinitura.

## Performance e SSR

- Non aggiungere immagini, font o dipendenze senza valutarne impatto su bundle size e Core Web Vitals.
- Non accedere direttamente a `window`, `document`, `navigator` o `localStorage` in codice eseguito durante SSR.
- Non risolvere problemi SSR disabilitando SSR o hydration senza una decisione esplicita e documentata.

## Processo

- Leggere `Agents.md` e tutta la wiki pertinente prima di agire.
- Fermarsi e chiedere chiarimenti se un requisito è ambiguo o contraddice questi confini.
- Dopo ogni cambiamento significativo, aggiornare `best-practices.md`, `milestones.md` o questo file quando necessario.
- Prima di dichiarare completata un’attività, eseguire le verifiche disponibili e riportare eventuali limiti.
