---
title: Landing 3D — scena, personaggi e sezioni
created: 2026-10-05
updated: 2026-10-05
type: module
tags: [module, landing, threejs, gsap]
project: childhood-friendship-website
status: active
confidence: medium
sources: [apps/web/src/app/landing-page/scene/builder-scene.ts, apps/web/src/app/landing-page/scene/builder-rig.ts, apps/web/src/app/landing-page/portfolio/portfolio.component.ts, apps/web/src/app/landing-page/contact/contact-section.component.ts, apps/web/scripts/rig-builder.mjs, apps/web/scripts/rig-partner.mjs]
---

# Landing 3D

Una tela WebGL fissa (`cf-scene`, caricata con `@defer (on idle)`) dietro alle sezioni scure. Le sezioni chiare/opache la coprono; la scena disegna solo quando hero, metodo, portfolio o finale sono a schermo.

## Ordine delle sezioni

hero → manifesto → servizi → **chi siamo** → metodo → portfolio → finale → contatti → footer. La navbar segue lo stesso ordine (Cosa facciamo, Chi siamo, Come lavoriamo, Progetti). Il listino è stato rimosso (duplicava i prezzi dei servizi): vedi [[pricing.md|offerta]].

## Personaggi

| Modello | File | Rig |
|---|---|---|
| Builder (testa viola, felpa nera) | `public/models/builder.glb` (1,2 MB) | `scripts/rig-builder.mjs` |
| Socio (testa bianca, felpa viola) | `public/models/partner.glb` (0,44 MB, decimato da 1,9M a 30k triangoli) | `scripts/rig-partner.mjs` |

I modelli Tripo arrivano senza ossa: lo scheletro (24 giunti, stessi nomi) e i pesi sono generati in codice. `BuilderRig` anima entrambi: pose additive pesate da GSAP, molla smorzata per osso con sotto-passi da 1/120 s, IK a due ossa per mano, camminata procedurale nata dallo spostamento reale, respiro e sguardo sul cursore.

## Sequenza guidata dallo scroll

1. **Hero**: su desktop due colonne; su mobile (alla Olter) titolo e frase in alto a destra, Builder grande al centro, CTA in basso a sinistra, e il Builder gira su sé stesso finché la pagina è in cima (lento di fronte, veloce di spalle), fermandosi frontale al primo scroll; il Builder è centrato nel `#hero-stage` (posizione e scala misurate dal DOM) e regge il laptop con IK. Saluta all'ingresso.
2. **Zoom nel laptop** (hero fissato per 120% di scroll): la camera si allinea alla posa reale dello schermo finché lo riempie. Lo schermo ha le proporzioni della finestra e mostra il manifesto disegnato dal DOM (stesso font e parole accese): a zoom finito la sezione vera subentra senza stacco (manifesto con `margin-top: -100vh`, nascosto fino a zoom = 1).
3. **Metodo**: palco `#method-stage`; una posa per fase; dal passo 2 il socio cade dall'alto, atterra e saluta.
4. **Portfolio**: carosello 3D CSS guidato dallo scroll; ogni card entra, si ferma, si gira sui dettagli ed esce; hover = card girata e ingrandita, click = sito live (solo progetti con `link`); classe `.pcard` (`.card` è dello stile admin globale); evento `cf:portfolio` → il socio presenta, il Builder "gira". I due stanno in `#port-left` / `#port-right`.
5. **Finale** (fissato per 230%): entrate dai lati, logo dal fondo al centro → portale, salto + batti cinque a tempo (lampo, scintille, scossa), dissolvenza in particelle (vertici deformati, colore dalla texture) verso l'esterno, logo che gira veloce, camera dentro l'anello, velo viola.
6. **Contatti**: la card viola nasce a tutto schermo dal velo e si stringe (scroll-driven CSS); form a quiz in 6 step.

## Altre sezioni e pagine

- **Chi siamo** (`about/`): titolo a particelle (`particle-text.ts`) che si materializza in vista e si sgretola al passaggio del puntatore; a riposo torna il testo vero.
- **Finale**: bottoni solo icona (email, telefono, Instagram); i valori stanno in `landing-page/contacts.ts`.
- **Caveau** (`/caveau`): solo ambiente 3D, ingresso cinematografico attraverso la porta, camera smorzata con carrellata a riposo, click su quadro/teca per inquadrarlo, Esc per tornare.

## Verifica

Le fasi sono state verificate con Chromium headless a fotogrammi fermi (swiftshader a 1–4 fps: GSAP rallenta i tween). Il passaggio laptop → manifesto è stato confrontato pixel per pixel (differenze solo sull'antialiasing). Fluidità reale e mobile: da verificare in un browser vero (`confidence: medium`).

Collegamenti: [[modules/component-catalog.md|catalogo componenti]], [[architecture/system-architecture.md|architettura]], [[current-status.md|stato]].
