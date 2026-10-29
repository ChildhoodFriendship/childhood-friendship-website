/**
 * Testo canonico del contratto: lo stesso modulo genera la pagina del portale e, lato server,
 * il testo di cui si calcola l'impronta SHA-256 al momento della firma. Così l'impronta
 * prova esattamente cosa (testo + preventivo allegato) è stato accettato.
 *
 * Cambiare il testo = nuova CONTRACT_VERSION. Testo da far rivedere a un legale.
 */
import { computeQuote, FLAT_RATE_NOTICE, formatMoney, INVOICE_WITHIN_DAYS, type Currency } from './billing.js';
import { COMPANY, vatLabel, vatLabelEn, type CompanyProfile } from './company.js';

export const CONTRACT_VERSION = '2026-10-30';

export interface ContractInput {
  lang: 'it' | 'en';
  projectName: string;
  clientName: string;
  currency: Currency;
  items: readonly { name: string; priceCents: number; monthly: boolean }[];
  company?: CompanyProfile;
}

export interface ContractArticle { title: string; paragraphs: string[] }

export interface ContractDoc {
  version: string;
  lang: 'it' | 'en';
  title: string;
  subtitle: string;
  parties: string[];
  articles: ContractArticle[];
  annexTitle: string;
  annexLines: string[];
  specialClausesTitle: string;
  specialClauses: string;
}

export function buildContract(input: ContractInput): ContractDoc {
  const c = input.company ?? COMPANY;
  const q = computeQuote(input.items, 0);
  const m = (cents: number) => formatMoney(cents, input.currency);
  const dep = q.tranches.find((t) => t.tranche === 'acconto') ?? { totalCents: 0 };
  const bal = q.tranches.find((t) => t.tranche === 'saldo') ?? { totalCents: 0 };
  const stampTotal = q.tranches.reduce((s, t) => s + t.stampDutyCents, 0);
  const totalDue = q.oneOffCents + stampTotal;
  const seat = c.registeredOffice ?? c.city;
  const lines = input.items.filter((i) => i.priceCents > 0);

  if (input.lang === 'en') {
    return {
      version: CONTRACT_VERSION,
      lang: 'en',
      title: 'SOFTWARE DEVELOPMENT AGREEMENT',
      subtitle: `Project "${input.projectName}"`,
      parties: [
        `PROVIDER: ${c.owner}, sole proprietor trading as "${c.brand}" (${vatLabelEn(c)}), ${seat}, Italy, email ${c.email} ("Provider").`,
        `CLIENT: ${input.clientName}, commissioning the project "${input.projectName}" ("Client").`
      ],
      articles: [
        { title: '1. Scope', paragraphs: [`The Provider designs and develops the project "${input.projectName}" as described in the quote in Annex A, which forms part of this Agreement.`] },
        { title: '2. Fees, invoices and payment', paragraphs: [
          `2.1 Fees are those listed in Annex A. ${FLAT_RATE_NOTICE.en} The Italian stamp duty of 2.00 per invoice above 77.47 is charged to the Client.`,
          `2.2 Payment in two instalments: a 50% deposit (${m(dep.totalCents)}) and a 50% balance (${m(bal.totalCents)}) on delivery, after the acceptance under Section 5.`,
          `2.3 The Provider will send the invoice and the payment link for the deposit within ${INVOICE_WITHIN_DAYS} days of signature. No payment is due before the corresponding invoice is issued. Payment by card through Stripe or by bank transfer.`,
          '2.4 The deposit covers the analysis and set-up work started after it is paid: if the Client withdraws after work has started, the Provider retains the deposit as consideration for the work done.'
        ] },
        { title: '3. Timeline', paragraphs: ['Work starts once the deposit is received. Delivery dates are agreed in the client portal and may shift by the time the Client takes to provide materials or feedback.'] },
        { title: '4. Intellectual property', paragraphs: ['Rights to use the bespoke deliverables pass to the Client upon full payment. Until then the Client has a temporary licence to review them. The Provider may show the project in its portfolio unless the Client objects in writing. Third-party components remain under their own licences.'] },
        { title: '5. Acceptance', paragraphs: ['On delivery of the review (staging) version, the Client has 10 business days to report any non-conformity in writing. If no report is received in that period, the deliverables are deemed accepted.'] },
        { title: '6. Warranty', paragraphs: ['The Provider fixes free of charge any defect against the agreed specifications reported within 30 days of go-live. New features, redesigns and issues caused by third-party changes are quoted separately.'] },
        { title: '7. Third-party services and liability', paragraphs: ['The Provider is not liable for outages of third-party services (hosting, databases, DNS, payment gateways) beyond its control. Except in case of wilful misconduct or gross negligence, the Provider\'s liability is limited to the fees actually paid under this Agreement.'] },
        { title: '8. Client materials and personal data', paragraphs: ['The Client warrants that it holds the rights to the texts, images and trademarks it provides and holds the Provider harmless from third-party claims. Where the Provider processes personal data on the Client\'s behalf, the parties sign a data processing agreement (Art. 28 GDPR).'] },
        { title: '9. Taxes', paragraphs: ['The Provider is an Italian resident sole proprietor with no permanent establishment in the United States. Upon request, the Provider supplies a completed and signed IRS Form W-8BEN.'] },
        { title: '10. Governing law and venue', paragraphs: ['This Agreement is governed by Italian law. The court of Padua, Italy, has exclusive jurisdiction.'] }
      ],
      annexTitle: 'ANNEX A - QUOTE',
      annexLines: [
        ...lines.map((i) => `${i.name}: ${m(i.priceCents)}${i.monthly ? ' / month' : ''}`),
        `One-off total: ${m(q.oneOffCents)}`,
        ...(stampTotal ? [`Stamp duty: ${m(stampTotal)}`] : []),
        `Total due: ${m(totalDue)} (deposit ${m(dep.totalCents)} + balance ${m(bal.totalCents)})`,
        ...(q.monthlyCents ? [`Recurring fees: ${m(q.monthlyCents)} / month`] : []),
        'No VAT applied (flat-rate scheme).'
      ],
      specialClausesTitle: 'SPECIFIC APPROVAL OF CLAUSES',
      specialClauses: 'The Client specifically approves Sections 2.4 (deposit retained on withdrawal), 4 (transfer of rights upon full payment), 5 (deemed acceptance), 7 (limitation of liability) and 10 (exclusive venue).'
    };
  }

  return {
    version: CONTRACT_VERSION,
    lang: 'it',
    title: 'CONTRATTO DI SVILUPPO SOFTWARE',
    subtitle: `Progetto «${input.projectName}»`,
    parties: [
      `FORNITORE: ${c.owner}, titolare della ${c.legalForm} «${c.brand}» (${vatLabel(c)}${c.taxCode ? `, C.F. ${c.taxCode}` : ''}), ${seat}, email ${c.email} (il «Fornitore»).`,
      `COMMITTENTE: ${input.clientName}, per il progetto «${input.projectName}» (il «Committente»).`
    ],
    articles: [
      { title: 'Art. 1 - Oggetto', paragraphs: [`Il Fornitore progetta e sviluppa il progetto «${input.projectName}» come descritto nel preventivo dell'Allegato A, parte integrante del contratto.`] },
      { title: 'Art. 2 - Corrispettivo, fatture e pagamenti', paragraphs: [
        `2.1 Il corrispettivo è quello dell'Allegato A. ${FLAT_RATE_NOTICE.it} Sulle fatture di importo superiore a 77,47 € è dovuta l'imposta di bollo di 2 €, addebitata al Committente.`,
        `2.2 Pagamento in due tranche: acconto del 50% (${m(dep.totalCents)}) e saldo del 50% (${m(bal.totalCents)}) alla consegna, dopo l'accettazione di cui all'art. 5.`,
        `2.3 Il Fornitore invia fattura e link di pagamento dell'acconto entro ${INVOICE_WITHIN_DAYS} giorni dalla firma. Nessun pagamento è dovuto prima dell'emissione della relativa fattura. Pagamento con carta tramite Stripe o con bonifico.`,
        '2.4 L\'acconto remunera l\'analisi e l\'impostazione avviate dopo il suo pagamento: se il Committente recede dopo l\'avvio dei lavori, il Fornitore trattiene l\'acconto come corrispettivo per l\'attività svolta.'
      ] },
      { title: 'Art. 3 - Tempi', paragraphs: ['I lavori iniziano alla ricezione dell\'acconto. Le date di consegna sono concordate nel portale e slittano dei tempi impiegati dal Committente per fornire materiali o riscontri.'] },
      { title: 'Art. 4 - Proprietà intellettuale', paragraphs: ['I diritti di utilizzo economico delle opere realizzate su misura passano al Committente con il pagamento integrale. Fino ad allora il Committente ha una licenza temporanea per la sola revisione. Il Fornitore può mostrare il progetto nel proprio portfolio salvo opposizione scritta del Committente. I componenti di terzi restano soggetti alle rispettive licenze.'] },
      { title: 'Art. 5 - Collaudo', paragraphs: ['Alla consegna della versione di prova (staging) il Committente ha 10 giorni lavorativi per segnalare per iscritto eventuali difformità. In assenza di segnalazioni entro il termine, l\'opera si intende accettata.'] },
      { title: 'Art. 6 - Garanzia', paragraphs: ['Il Fornitore corregge gratuitamente i difetti rispetto alle specifiche segnalati entro 30 giorni dalla pubblicazione. Nuove funzioni, modifiche grafiche e problemi causati da interventi di terzi sono quotati a parte.'] },
      { title: 'Art. 7 - Servizi di terzi e responsabilità', paragraphs: ['Il Fornitore non risponde di interruzioni di servizi di terzi (hosting, database, DNS, gestori di pagamento) fuori dal suo controllo. Salvo dolo o colpa grave (art. 1229 c.c.), la responsabilità del Fornitore è limitata ai corrispettivi effettivamente pagati in base al contratto.'] },
      { title: 'Art. 8 - Materiali del Committente e dati personali', paragraphs: ['Il Committente garantisce di avere i diritti su testi, immagini e marchi forniti e tiene indenne il Fornitore da pretese di terzi. Se il Fornitore tratta dati personali per conto del Committente, le parti sottoscrivono un accordo ai sensi dell\'art. 28 GDPR.'] },
      { title: 'Art. 9 - Consumatori', paragraphs: ['Se il Committente è un consumatore restano fermi i diritti del Codice del Consumo, compreso il recesso entro 14 giorni dalla conclusione del contratto (artt. 52 ss.); l\'art. 2.4 e l\'art. 10 non si applicano in quanto incompatibili.'] },
      { title: 'Art. 10 - Legge applicabile e foro', paragraphs: ['Il contratto è regolato dalla legge italiana. Per ogni controversia è competente in via esclusiva il Foro di Padova.'] }
    ],
    annexTitle: 'ALLEGATO A - PREVENTIVO',
    annexLines: [
      ...lines.map((i) => `${i.name}: ${m(i.priceCents)}${i.monthly ? ' / mese' : ''}`),
      `Totale una tantum: ${m(q.oneOffCents)}`,
      ...(stampTotal ? [`Imposta di bollo: ${m(stampTotal)}`] : []),
      `Totale dovuto: ${m(totalDue)} (acconto ${m(dep.totalCents)} + saldo ${m(bal.totalCents)})`,
      ...(q.monthlyCents ? [`Canoni ricorrenti: ${m(q.monthlyCents)} / mese`] : []),
      'IVA non applicata (regime forfettario).'
    ],
    specialClausesTitle: 'APPROVAZIONE SPECIFICA (artt. 1341 e 1342 c.c.)',
    specialClauses: 'Il Committente approva specificamente gli articoli 2.4 (trattenimento dell\'acconto in caso di recesso), 4 (passaggio dei diritti al saldo), 5 (accettazione in assenza di segnalazioni), 7 (limitazione di responsabilità) e 10 (foro esclusivo).'
  };
}

/** Testo semplice del contratto: è ciò che viene firmato e di cui si salva l'impronta. */
export function contractPlainText(doc: ContractDoc): string {
  return [
    `${doc.title} - ${doc.subtitle}`,
    `Versione ${doc.version} (${doc.lang})`,
    '',
    ...doc.parties,
    '',
    ...doc.articles.flatMap((a) => [a.title, ...a.paragraphs, '']),
    doc.annexTitle,
    ...doc.annexLines,
    '',
    doc.specialClausesTitle,
    doc.specialClauses
  ].join('\n');
}
