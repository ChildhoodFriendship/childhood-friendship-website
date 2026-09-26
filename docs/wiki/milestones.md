# Milestones e Stato Attuale

## Stato corrente

**Fase:** 0 — Fondazioni e governance del progetto  
**Stato:** Landing page responsive implementata e verificata con build Angular; Formspree configurato localmente e refactor CSS/componenti completato; invio reale già verificato; nessun componente 3D o animazione avanzata ancora introdotto.  
**Ultimo aggiornamento:** 2026-09-26

### Completato

- Creato `Agents.md` nella root con istruzioni operative e riferimenti alla wiki.
- Creata la wiki in `docs/wiki/`.
- Definite best practices per Angular 22, Signal, Standalone Components e TypeScript rigoroso.
- Definito il Design System iniziale con palette nero/viola, token UI, accessibilità e UI Kit condiviso.
- Definite regole per SSR, Core Web Vitals, bundle size e caricamento delle risorse.
- Definiti Conventional Commits e processo obbligatorio di aggiornamento della documentazione.
- Definiti confini architetturali e limitazioni operative.
- Creata la prima landing page responsive con sezioni hero, servizi, chi siamo, metodo di lavoro e contatti.
- Sostituito il collegamento `mailto:` con un form contatti AJAX basato su Formspree, senza pubblicare l’indirizzo email.
- Centralizzato l’endpoint Formspree in `src/environments/environment.ts`, versionato perché contiene solo un identificativo pubblico, con template condivisibile in `src/environments/environment.example.ts`.
- Configurata la shell standalone con route lazy-loaded per la landing page.
- Centralizzati i token UI in `src/styles.css` e applicata la palette ufficiale.
- Suddivisa la landing page in componenti standalone per header, hero, trust bar, servizi, chi siamo, metodo, contatti e footer, ciascuno con file `.ts`, `.html` e `.css`.

### In corso

- Nessuna attività di codice bloccante.
- Browser verification visuale non eseguita perché Chromium non è installato nell’ambiente; endpoint locale verificabile tramite server dev.
- Effetti 3D e animazioni avanzate rimandati a una fase successiva.

## Roadmap

### Fase 0 — Fondazioni e governance

- [x] Definire `Agents.md`.
- [x] Definire best practices.
- [x] Definire boundaries.
- [x] Definire il processo di aggiornamento della wiki.

### Fase 1 — Shell applicativa e design foundation

- [x] Verificare e allineare la configurazione Angular 22 esistente.
- [x] Definire app shell, routing iniziale e layout responsive.
- [x] Definire token UI per palette nero/viola, tipografia, spaziature e stati.
- [x] Implementare la prima landing page responsive.
- [ ] Implementare `shared/components/` per gli elementi UI riutilizzabili.
- [x] Suddividere la landing page in componenti standalone con HTML, TypeScript e CSS separati.
- [x] Convertire gli stili del progetto da SCSS a CSS nativo.
- [ ] Verificare contrasto WCAG 2.2 AA e comportamento responsive del UI Kit.
- [ ] Aggiungere effetti 3D e animazioni solo dopo una revisione dedicata.

### Fase 2 — Landing e posizionamento

- [ ] Presentare servizi, metodo di lavoro e vantaggi competitivi.
- [ ] Integrare slogan “Codice su misura, radici solide”.
- [x] Implementare CTA e contatto con accessibilità e validazione.
- [x] Verificare l’invio reale dopo la configurazione del Form ID in `src/environments/environment.ts`.

### Fase 3 — Qualità e rilascio

- [ ] Aggiungere test unitari e di integrazione secondo il rischio.
- [ ] Verificare performance, responsive behavior, SEO e accessibilità.
- [ ] Definire pipeline di build, controllo qualità e deployment.

### Fase 4 — Evoluzione

- [ ] Estendere eventuali aree riservate o web app senza compromettere i confini iniziali.
- [ ] Valutare integrazioni esterne solo tramite decisione documentata.

## Regola di aggiornamento

Ogni modifica significativa, refactoring o funzionalità completata deve aggiornare questo file: stato corrente, checkbox della milestone interessata e attività in corso. La data va aggiornata solo quando il contenuto cambia davvero.
