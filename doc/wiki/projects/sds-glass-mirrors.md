# SDS Glass & Mirrors (demo per lead USA)

## Scopo

Sito dimostrativo costruito fuori dal monorepo per un lead USA senza sito web: SDS Glass and Mirrors, Inc. (Margate, Florida), docce frameless, specchi e mensole in vetro su misura. Serve a mostrare il livello del lavoro prima di un primo contatto. Stato al 2026-10-31: demo completa, nessun contatto con l'azienda, nulla venduto.

## Dove si trova

| Cosa | Dove |
|---|---|
| Sorgente locale | `C:\Users\User\Desktop\sds-glass-mirrors` |
| Repository | GitHub privato `Lorenzozero/sds-glass-mirrors`, branch `main` |
| Istruzioni di pubblicazione | `README.md` nel repository |
| Memoria | nota `project-sds-glass-mirrors` nel vault |

Il repository resta **privato**: il sito usa nome, indirizzo e recensioni reali dell'azienda senza il suo consenso.

## Configurazione

- HTML/CSS/JS statico senza build: GSAP, ScrollTrigger, SplitText, Lenis; Three.js solo per il loader 3D su desktop.
- `index.html` (italiano) e `en.html` (inglese): la lingua segue il browser, EN/IT solo su desktop; `?nolang` blocca il redirect nei test.
- `js/config.js`: unico punto di configurazione del modulo (`endpoint` o `email`) e dei social ufficiali.
- Segnaposto `__SITE_URL__` in canonical, hreflang, Open Graph e sitemap: si sostituisce con `python tools/set_domain.py https://dominio`.
- `_headers` (Netlify/Cloudflare) e `vercel.json`: sicurezza e cache.

## Direzione artistica

- Vetro bagnato: video hero a tutto schermo, vetrata video fissa dietro le sezioni scure, texture smerigliata dove il fondo è chiaro, bordi sfumati con maschera, componenti in glassmorphism.
- Font Instrument Serif e Hanken Grotesk; palette abisso, nebbia, ghiaccio, verde, ambra, brace.
- Loader: diamante 3D su schermi ≥900px e computer potenti; loader SVG leggero su mobile. Il logo vola nella navbar a fine caricamento.
- Servizi con disegni animati (porta che si apre, pannelli che scorrono, persona riflessa nello specchio); su mobile lo scroll verticale muove il binario.

## Verifiche

Lighthouse in simulazione mobile, con dominio impostato: accessibilità 100, best practice 100, SEO 100, prestazioni 47 (LCP 5,1 s, TBT 1,1 s; il limite è il loader scenografico più le librerie di animazione). Video: hero 1,3 MB, vetrata 1,2 MB, vetrata caricata solo quando serve.

## Punti aperti

- Confermare con il titolare: «sopralluogo/preventivo gratuito» (una scheda online lo smentisce), indirizzo e zone servite.
- Foto reali dei lavori; licenza e P.IVA nelle pagine legali; consenso per usare nome e recensioni.
- Modulo senza invio email finché non si imposta `endpoint` o `email`; profili social ufficiali non trovati.
- Pagine legali (privacy, cookie, termini, conformità, IT+EN) sono una base da far rivedere.
- Test su iPhone/Safari e Android reali non eseguiti.
- Dominio, hosting e HTTPS non scelti.
