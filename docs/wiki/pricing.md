---
title: Offerta e listino
created: 2026-09-28
updated: 2026-10-05
type: concept
tags: [project, documentation]
project: childhood-friendship-website
status: active
confidence: high
sources: [apps/web/src/app/landing-page/services/services.component.ts]
---

> **Aggiornamento 2026-10-05**: la sezione listino separata è stata rimossa dalla landing perché duplicava i prezzi già mostrati nei servizi (da 200 € sito, da 600 € web app, da 700 € app mobile, da 20 €/mese cura). Al suo posto c'è il portfolio: vedi [[modules/landing-3d.md|landing 3D]]. Le righe sotto restano come storico dell'offerta "dopo il lancio" (canone 20 €/mese, modifica a chiamata 50 €).


# Offerta e listino

La sezione prezzi della landing espone due viste gestite dal Signal `activeView`.

## Sviluppo iniziale

| Piano | Prezzo esposto | Elementi dichiarati |
|---|---:|---|
| Landing Page | €200 | Design custom dark/tech, SEO tecnica, form di contatto |
| Web App | €600 | Angular 22 e routing, gestione stato, integrazione API e database |
| App Mobile | €700 | Cross-platform, logica e dati, autenticazione |

## Gestione post-lancio

| Piano | Prezzo esposto | Elementi dichiarati |
|---|---:|---|
| Canone di manutenzione | €20/mese | Supporto, verifiche di stabilità, piccoli interventi |
| Modifica a chiamata | €50/modifica | Modifica testuale, aggiornamento grafico, intervento singolo |

## Vincolo commerciale esplicito

Il template specifica che hosting, dominio, servizi cloud e infrastruttura sono esclusi dall'offerta tecnica.

Questa pagina documenta ciò che il codice espone; non aggiunge condizioni commerciali non presenti nella landing.

Pagine correlate: [[projects/childhood-friendship-website.md|progetto]], [[modules/component-catalog.md|catalogo componenti]] e [[current-status.md|stato]].
