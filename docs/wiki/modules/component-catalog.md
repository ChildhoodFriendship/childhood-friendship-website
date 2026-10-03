---
title: Catalogo dei componenti della landing
created: 2026-09-28
updated: 2026-10-03
type: module
tags: [module, architecture, documentation]
project: childhood-friendship-website
status: active
confidence: high
sources: [src/app/landing-page/landing-page.component.ts, src/app/landing-page/header, src/app/landing-page/hero, src/app/landing-page/trust-bar, src/app/landing-page/services, src/app/landing-page/pricing, src/app/landing-page/about, src/app/landing-page/process, src/app/landing-page/contact, src/app/landing-page/footer]
---

# Catalogo dei componenti della landing

Catalogo derivato dai componenti presenti nel codice. La presenza del componente non equivale alla verifica visuale o all'accettazione browser.

## Shell e navigazione

| Componente | Responsabilità | Sorgente |
|---|---|---|
| `AppComponent` | Root standalone con `router-outlet` | `src/app/app.component.ts` |
| `LandingPageComponent` | Composizione ordinata della pagina | `src/app/landing-page/landing-page.component.*` |
| `HeaderComponent` | Header della landing | `src/app/landing-page/header/*` |
| `FooterComponent` | Footer della landing | `src/app/landing-page/footer/*` |

## Contenuto e interazioni

| Componente | Responsabilità | Stato/verifica |
|---|---|---|
| `HeroSectionComponent` | Hero, canvas Three.js, showcase e modale | Stato locale complesso; smoke test browser aperto |
| `TrustBarComponent` | Barra di elementi di fiducia | Contenuto statico osservato nel template |
| `ServicesSectionComponent` | Tre card servizio da array readonly | Tipizzato; contenuto statico |
| `PricingSectionComponent` | Tab sviluppo/manutenzione e card prezzo | Signal locale; verificare tastiera e pannelli |
| `AboutSectionComponent` | Posizionamento e identità | Contenuto statico |
| `ProcessSectionComponent` | Tre passaggi del metodo | Array readonly tipizzato |
| `ContactSectionComponent` | Form contatti → `/api/public/leads` (lead in area admin) | Verificato con smoke test |
| `HeroStaticComponent` | Hero HTML/CSS: fallback mobile, reduced-motion, senza WebGL e placeholder del 3D | Verificato |

## Tecnologie e convenzioni

- Tutti i componenti osservati sono standalone e usano `ChangeDetectionStrategy.OnPush`.
- I componenti figli hanno directory dedicate.
- I template usano control flow Angular moderno (`@if`, `@for`, `@switch`).
- I dati statici hanno interfacce locali readonly.
- Lo stile globale usa font esterni Google Fonts, palette scura e focus visibile.

## Gap di verifica

- Non sono presenti test di componente osservati nella struttura sorgente.
- Il comportamento Three.js richiede browser reale e verifica di teardown.
- Il form richiede verifica controllata del servizio esterno.

Pagine correlate: [[application-modules.md|moduli applicativi]], [[../architecture/system-architecture.md|architettura]], [[../runbooks/local-development.md|runbook]] e [[../current-status.md|stato]].
