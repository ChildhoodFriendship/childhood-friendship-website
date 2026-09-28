# Childhood Friendship — Wiki del progetto

Questa cartella è la base di conoscenza durevole del progetto `childhood-friendship-website`. È destinata sia alle persone sia agli agenti: i fatti devono essere collegati alle evidenze del repository, lo stato corrente va separato dall'architettura stabile e le procedure operative devono rimanere vicine al progetto.

## Da dove iniziare

1. Leggere [`SCHEMA.md`](SCHEMA.md) prima di aggiungere o modificare una pagina.
2. Consultare [`index.md`](index.md) per trovare progetto, architettura, moduli e runbook.
3. Consultare [`current-status.md`](current-status.md) per lo snapshot dei milestone.
4. Consultare [`agent-guide.md`](agent-guide.md) per il flusso di lavoro degli agenti.
5. Consultare [`token-usage.md`](token-usage.md) per indagini ampie o handoff.

## Struttura

- `projects/` — scopo, comandi, vincoli ed evidenze del progetto.
- `architecture/` — forma del sistema e confini runtime.
- `modules/` — inventario dei moduli e note implementative.
- `decisions/` — decisioni architetturali durevoli.
- `runbooks/` — procedure ripetibili di sviluppo e operatività.
- `bugs/` — diagnosi di bug durevoli e fix verificati.
- `raw/` — acquisizioni di fonti immutabili; non modificare le catture.
- `templates/` — modelli per future pagine.

## Regole di manutenzione

- Usare riferimenti relativi al repository; non salvare segreti o valori di credenziali.
- Mantenere sincronizzati `index.md` e `log.md` a ogni modifica della wiki.
- Aggiornare `updated` nel frontmatter quando una pagina cambia.
- Esplicitare l'incertezza con `confidence: low` e indicare come verificarla.
- Non sostituire silenziosamente un fatto contraddetto: conservare entrambe le affermazioni e collegare le evidenze.

La wiki descrive il repository osservato in un dato momento. Codice, configurazione, output di build e comandi di verifica espliciti prevalgono sulle inferenze.
