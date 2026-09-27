# Listino commerciale

## Sviluppo iniziale — one-off

| Pacchetto | Prezzo | Include |
|---|---:|---|
| Landing Page | €200 | Monopagina ad alta conversione, design custom dark/tech, ottimizzazione SEO tecnica e form di contatto |
| Web App | €600 | Applicazione web multipagina custom basata su Angular 22, routing avanzato, gestione stato e integrazione API/database |
| App Mobile | €700 | Applicazione mobile cross-platform ad alte prestazioni, logica di base, gestione dati e autenticazione |

## Gestione post-lancio e manutenzione

| Servizio | Prezzo | Include |
|---|---:|---|
| Canone di manutenzione | €20 / mese | Supporto continuativo, verifiche di stabilità e piccoli interventi di controllo |
| Modifica a chiamata | €50 / modifica | Singola modifica testuale, grafica o aggiornamento spot richiesto dal cliente |

## Esclusioni

I costi di hosting, dominio, servizi cloud, database gestiti, servizi email, store mobile e qualsiasi altra infrastruttura sono completamente esclusi dall’offerta tecnica. Devono essere valutati e sostenuti separatamente dal cliente.

## Implementazione frontend

Il listino è presentato nella landing page dal componente standalone `src/app/landing-page/pricing/`, composto da:

- `pricing-section.component.ts` per dati tipizzati e Signal della tab attiva;
- `pricing-section.component.html` per card, tab accessibili e CTA;
- `pricing-section.component.css` per la presentazione dark/tech coerente con il design system.
