---
title: "Catalogo componenti e moduli"
status: active
role: application
source:
  references:
    - part: other
      path: apps/api/src/lib/notify.ts
    - part: model
      path: packages/shared/src/types.ts
    - part: model
      path: packages/shared/src/catalog.ts
    - part: model
      path: packages/shared/src/schemas.ts
---

## Short Description

Questa sezione mappa i componenti principali della web app, dell’API e del package shared del superproject.

## Description

Il codice è raggruppato per responsabilità: shell e landing pubblica, aree web autenticate, middleware/route API e catalogo condiviso. La mappa sintetizza i confini già documentati; la presenza di un nome in elenco non sostituisce l’ispezione del sorgente.

## Functional Characteristics

- Shows landing pubblica, hero, portfolio, contatti e pagine applicative attraverso `apps/web`.
- Manages UI admin e portale tramite feature e route separate.
- Validates gli input API con schemi Zod condivisi.
- Stores dati tramite Drizzle e PostgreSQL nel backend.
- Notifies il team per gli eventi configurati nel modulo di notifica, secondo la documentazione di progetto.

| Area | Responsabilità verificata |
|---|---|
| Web shell/landing | Bootstrap, contenuti pubblici, sezioni e navigazione |
| Web admin/portal | Gestione interna e flussi cliente con DTO dedicati |
| API middleware/routes | Autenticazione, autorizzazione, validazione, audit e servizi applicativi |
| `SecretBox` | Cifratura e rivelazione controllata delle credenziali cliente |
| `packages/shared` | Tipi, catalogo dominio, DTO e schemi Zod |
| Utility 3D | Scene/rig/animazioni della landing e del caveau, con caricamento differito |

## Interfaces And Protocols

La web app usa l’API HTTP/JSON. Gli endpoint n8n/lead e i provider di notifica sono integrazioni server-side; documentare i loro payload e segreti solo nei punti dedicati e senza valori segreti.

## Dependencies And Relationships

I moduli web dipendono dai DTO e schemi condivisi; l’API dipende da `packages/shared`, Drizzle e PostgreSQL. I moduli 3D dipendono dalle utility e dagli asset del frontend.

## Procedures

Quando si aggiunge o sposta un modulo, verificare l’effettivo package, route, responsabilità e test; aggiornare il relativo documento, la wiki index e il log. Non inferire il comportamento del portale dai modelli admin o viceversa.
