# Schema della wiki del progetto

## Scopo

Base di conoscenza durevole e ricercabile per fatti, architettura, workflow, stato, decisioni e debugging di Childhood Friendship. Il codice e la configurazione correnti prevalgono sulle inferenze della wiki.

## Convenzioni

- Nomi file minuscoli, con trattini e senza spazi.
- Le pagine informative iniziano con YAML frontmatter.
- Usare `[[wikilinks]]`; ogni pagina dovrebbe avere almeno due link utili quando possibile.
- Aggiornare `updated` a ogni modifica.
- Collegare ogni pagina durevole da `index.md`.
- Registrare ogni modifica strutturale o contenutistica in `log.md`.
- Preferire evidenze: percorsi sorgente, configurazione, test, commit e documentazione ufficiale.
- Non salvare segreti, token, password, chiavi private o credenziali.
- Usare `confidence: low` quando mancano prove e indicare come verificarle.
- Tenere fuori dalle pagine durevoli le note temporanee che non cambiano la conoscenza del progetto.

## Confidence

- `high`: confermato da codice/configurazione correnti e, quando pertinente, da un comando riuscito.
- `medium`: supportato dal codice ma non verificato completamente a runtime, in browser o con servizi esterni.
- `low`: inferito, datato, contraddittorio o dipendente da evidenze mancanti.

Usare il livello più basso coerente con l'affermazione più debole importante della pagina.

## Frontmatter

```yaml
---
title: Titolo pagina
created: YYYY-MM-DD
updated: YYYY-MM-DD
type: project | module | guidance | status | decision | workflow | bug | policy
tags: [project, architecture]
project: childhood-friendship-website
status: active | superseded | resolved | open | archived
confidence: high | medium | low
sources: [path/or/url]
---
```

## Regole delle pagine

- Creare pagine per progetto, modulo importante, integrazione non ovvia, bug durevole, procedura ripetibile o stato di milestone.
- Non creare pagine per dettagli banali già chiari dal codice vicino.
- Mantenere le pagine sotto circa 200 righe; separare solo gli approfondimenti realmente necessari.
- Conservare le contraddizioni con le rispettive evidenze.
- Ogni fatto temporale deve avere data o percorso sorgente.
- Le pagine guida descrivono comportamenti ripetibili, non supposizioni sul progetto.

## Manutenzione

Quando si aggiorna una pagina: controllare l'indice, cercare termini correlati nella wiki, leggere il codice pertinente, aggiornare i link, aggiornare `index.md` e `log.md`, poi riportare la verifica.

## Ordine di orientamento

1. `SCHEMA.md`
2. `index.md`
3. `current-status.md`
4. ultime 20–30 righe di `log.md`
5. solo dopo le pagine e i file sorgente pertinenti
