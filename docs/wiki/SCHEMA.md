# Schema della wiki del progetto

## Scopo

Base di conoscenza durevole e ricercabile per fatti, decisioni, architettura, workflow, stato dei milestone e debugging del progetto. Deve evitare che futuri contributori o agenti debbano ricostruire da zero il contesto.

## Convenzioni

- Nomi file: minuscolo, trattini, nessuno spazio.
- Ogni pagina inizia con YAML frontmatter.
- Usare `[[wikilinks]]`; quando possibile ogni pagina deve avere almeno due collegamenti in uscita utili.
- Aggiornare `updated` a ogni modifica.
- Aggiungere ogni pagina a `index.md`.
- Registrare ogni azione strutturale o contenutistica in `log.md`.
- Preferire evidenze: file sorgente, configurazione, comandi, test e documentazione ufficiale.
- Non memorizzare segreti, token, password, chiavi private o credenziali.
- Marcare l'incertezza con `confidence: low` e spiegare come verificarla.
- Tenere fuori dalle pagine durevoli le note temporanee che non cambiano la conoscenza del progetto.

### Semantica di confidence

- `high` — confermato da codice/configurazione correnti e, quando pertinente, da un comando riuscito.
- `medium` — supportato dal codice o dalla documentazione, ma con comportamento runtime, browser o integrazioni esterne non completamente verificati.
- `low` — inferito, datato, contraddittorio o dipendente da evidenze mancanti; la pagina deve indicare la verifica necessaria.

Usare il livello più basso che descrive correttamente la principale affermazione della pagina.

## Frontmatter

```yaml
---
title: Titolo pagina
created: YYYY-MM-DD
updated: YYYY-MM-DD
type: project | architecture | module | api | decision | workflow | bug | runbook | concept | query | guidance | status | policy
tags: [project, architecture]
project: childhood-friendship-website
status: active | superseded | resolved | open | archived
confidence: high | medium | low
sources: [path/or/url]
---
```

## Tassonomia dei tag

- `project`, `architecture`, `module`, `api`, `database`, `deployment`
- `decision`, `workflow`, `testing`, `debugging`, `performance`, `security`
- `bug`, `runbook`, `dependency`, `integration`, `legacy`, `query`
- `guidance`, `status`, `milestone`, `token-usage`, `documentation`

Aggiungere qui un tag prima di usarlo.

## Regole delle pagine

- Creare pagine per progetto, modulo importante, integrazione non ovvia, bug durevole, procedura operativa, decisione architetturale o stato di milestone.
- Non creare pagine per dettagli banali già evidenti dal codice vicino.
- Mantenere le pagine orientativamente sotto 200 righe; separare gli approfondimenti quando necessario.
- Conservare le contraddizioni invece di sovrascriverle silenziosamente.
- Ogni fatto time-sensitive in una pagina di stato deve avere data o percorso sorgente.
- Le pagine guida descrivono comportamenti ripetibili degli agenti e non devono trasformare supposizioni in fatti.

## Riferimenti alle fonti

Usare percorsi relativi al repository, hash di commit, issue/PR URL, nomi di test e URL documentali. Esempi:

- `source: src/app/landing-page/contact/contact-section.component.ts:11-35`
- `verified_by: npm run build`
- `commit: abc1234`

## Manutenzione obbligatoria

Quando si aggiunge o aggiorna una pagina:

1. Controllare in `index.md` se esiste già una pagina.
2. Cercare termini correlati nella wiki.
3. Leggere sorgenti e configurazione pertinenti.
4. Aggiornare pagina e collegamenti.
5. Aggiornare `index.md` e `log.md`.
6. Se il comportamento cambia, includere evidenze di verifica.
7. Se un fatto è incerto, abbassare `confidence` anziché indovinare.

## Ordine di orientamento degli agenti

All'inizio di un'attività supportata dalla wiki leggere:

1. `SCHEMA.md`
2. `index.md`
3. `current-status.md`
4. ultime 20-30 righe di `log.md`
5. solo dopo le pagine e i file sorgente pertinenti
