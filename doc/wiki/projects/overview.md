---
title: "Contesto del progetto"
status: active
role: application
source:
  references:
    - part: configuration
      path: package.json
    - part: other
      path: README.md
---

## Short Description

Questa area documenta il contesto e i confini del prodotto Childhood Friendship ospitato nel superproject.

## Description

Il repository riunisce un sito pubblico, un’area amministrativa per il team, un portale clienti e l’API condivisa. La pagina [Childhood Friendship](childhood-friendship-website.md) raccoglie configurazione e route documentate; lo stato di deployment e provider resta nella [snapshot corrente](../current-status.md) e va riverificato.

## Functional Characteristics

- Shows il sito pubblico e il portale con contenuti separati per destinatari.
- Manages lead, progetti e documenti secondo i moduli applicativi descritti nel repository.
- Does not establish che tutti i provider o flussi esterni siano disponibili soltanto per la presenza del codice.

## Interfaces And Protocols

La web app comunica con l’API del superproject. Le integrazioni con database, provider email, pagamenti, storage e notifiche sono soggette a configurazione esterna e verifica live.

## Dependencies And Relationships

Questa area dipende da `apps/web`, `apps/api` e `packages/shared`; i dettagli operativi e fiscali restano nella pagina di [compliance](../compliance.md).
