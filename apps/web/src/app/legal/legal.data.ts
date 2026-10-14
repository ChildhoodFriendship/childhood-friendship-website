/**
 * Dati del titolare e testi di informativa privacy e cookie policy.
 * I tempi di conservazione devono coincidere con RETENTION_DAYS in apps/api/src/modules/retention/retention.ts.
 * Testi da far validare a un professionista prima dell'uso commerciale.
 */
export const LEGAL = {
  brand: 'Childhood Friendship',
  controllers: 'Lorenzo e Mirko, fondatori di Childhood Friendship',
  email: 'lorenzo@cfofficial.it',
  city: 'Padova (PD)',
  updated: '15 ottobre 2026'
} as const;

export interface LegalSection { title: string; paragraphs?: string[]; items?: string[]; }
export interface LegalDoc { title: string; intro: string; sections: LegalSection[]; }

export const PRIVACY: LegalDoc = {
  title: 'Informativa privacy',
  intro: `Questa informativa spiega quali dati personali tratta ${LEGAL.brand}, perché, per quanto tempo e quali sono i tuoi diritti (Regolamento UE 2016/679, "GDPR", artt. 13 e 14). Raccogliamo solo i dati che servono, non li vendiamo e non li usiamo per pubblicità o profilazione.`,
  sections: [
    {
      title: '1. Chi tratta i tuoi dati',
      paragraphs: [
        `Titolari del trattamento: ${LEGAL.controllers}, con recapito a ${LEGAL.city}.`,
        `Per qualsiasi richiesta sulla privacy scrivi a ${LEGAL.email}. Rispondiamo entro 30 giorni.`
      ]
    },
    {
      title: '2. Quali dati trattiamo e perché',
      items: [
        'Modulo contatti del sito — nome, email, telefono e azienda (facoltativi), descrizione del progetto, tempi e budget indicati. Servono a risponderti e a preparare un preventivo. Base giuridica: misure precontrattuali richieste da te (art. 6.1.b). Registriamo anche la versione dell\'informativa che hai letto e la data, per poterlo dimostrare (art. 5.2).',
        'Area clienti — nome, email, credenziali (la password è salvata solo in forma cifrata non reversibile), progetti, documenti, approvazioni, messaggi e file che carichi. Servono a realizzare e seguire il progetto concordato. Base giuridica: esecuzione del contratto (art. 6.1.b).',
        'Sicurezza — per proteggere gli account registriamo accessi, tentativi falliti e un registro delle operazioni. L\'indirizzo IP non viene mai salvato in chiaro: conserviamo solo un codice pseudonimo, non riconducibile all\'IP senza una chiave segreta. Base giuridica: legittimo interesse alla sicurezza del servizio (art. 6.1.f).',
        'Ricerca di nuovi clienti — cerchiamo attività commerciali della zona tra le informazioni pubblicate su Google Maps (nome dell\'attività, categoria, indirizzo, telefono, sito, valutazioni) per proporre i nostri servizi. Non raccogliamo dati di privati né dati sensibili. Base giuridica: legittimo interesse a far conoscere i nostri servizi ad altre imprese (art. 6.1.f). Puoi opporti in qualsiasi momento scrivendoci: cancelliamo subito i dati e non ti contattiamo più.'
      ]
    },
    {
      title: '3. Per quanto tempo li conserviamo',
      items: [
        'Richieste dal modulo contatti non diventate un progetto: 24 mesi dall\'ultimo contatto, poi cancellate automaticamente.',
        'Attività trovate con la ricerca di nuovi clienti e non diventate clienti: 12 mesi, poi cancellate automaticamente.',
        'Dati dei clienti e dei progetti: per la durata del rapporto e poi per il tempo richiesto dagli obblighi di legge (es. 10 anni per i documenti fiscali).',
        'Sessioni di accesso: 30 giorni dopo la scadenza. Inviti non usati: 90 giorni. Registro di sicurezza: 24 mesi.'
      ]
    },
    {
      title: '4. A chi li affidiamo',
      paragraphs: ['I dati sono trattati solo da noi e da fornitori che ci danno l\'infrastruttura, nominati responsabili del trattamento (art. 28) e vincolati a usarli solo per conto nostro:'],
      items: [
        'Vercel Inc. (USA) — hosting del sito e della piattaforma, archiviazione dei file caricati (data center a Francoforte, UE).',
        'Neon (Databricks, Inc., USA) — database della piattaforma, su server negli Stati Uniti.',
        'Telegram — notifiche interne al nostro team: contengono solo il tipo di evento e il nome del progetto o del servizio richiesto, mai il contenuto di messaggi, commenti o i tuoi recapiti.',
        'Resend (USA) — invio delle email di servizio (inviti e avvisi sul progetto), quando attivo.',
        'Per la ricerca di nuovi clienti: Apify (raccolta delle informazioni pubbliche delle attività) e Groq (preparazione di una bozza di messaggio). L\'automazione gira su un nostro server in Italia.'
      ]
    },
    {
      title: '5. Trasferimenti fuori dall\'Unione europea',
      paragraphs: [
        'Alcuni fornitori hanno sede negli Stati Uniti. I trasferimenti avvengono sulla base della decisione di adeguatezza UE-USA (EU-U.S. Data Privacy Framework) per i fornitori certificati, oppure delle clausole contrattuali tipo approvate dalla Commissione europea (art. 46). Puoi chiederci copia delle garanzie adottate.'
      ]
    },
    {
      title: '6. I tuoi diritti',
      paragraphs: [`In qualsiasi momento puoi chiederci, scrivendo a ${LEGAL.email}:`],
      items: [
        'accesso ai tuoi dati e copia (art. 15);',
        'rettifica dei dati inesatti (art. 16);',
        'cancellazione (art. 17), salvo i dati che dobbiamo conservare per legge;',
        'limitazione del trattamento (art. 18);',
        'portabilità dei dati in formato leggibile (art. 20);',
        'opposizione ai trattamenti basati sul legittimo interesse, compresa la ricerca di nuovi clienti (art. 21).'
      ]
    },
    {
      title: '7. Reclamo',
      paragraphs: ['Se ritieni che il trattamento violi il GDPR puoi presentare reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it) o all\'autorità del Paese in cui vivi o lavori.']
    },
    {
      title: '8. Altre informazioni',
      items: [
        'Fornire i dati del modulo contatti è facoltativo, ma senza nome ed email non possiamo risponderti.',
        'Non prendiamo decisioni basate unicamente su trattamenti automatizzati che producano effetti giuridici su di te (art. 22).',
        'Il sito non è rivolto ai minori di 14 anni.',
        'Possiamo aggiornare questa informativa: la data dell\'ultima modifica è indicata in fondo alla pagina.'
      ]
    }
  ]
};

export const COOKIES: LegalDoc = {
  title: 'Cookie policy',
  intro: 'Questo sito usa solo cookie tecnici, necessari al funzionamento dell\'area riservata. Non usiamo cookie di profilazione, di statistica o di terze parti, e non carichiamo risorse da server esterni (anche i caratteri tipografici sono ospitati da noi). Per questo non ti chiediamo un consenso: per i soli cookie tecnici non è richiesto (art. 122 Codice privacy, Linee guida del Garante del 10 giugno 2021).',
  sections: [
    {
      title: 'Cookie che usiamo',
      items: [
        'cf_at — mantiene l\'accesso all\'area riservata. Dura 15 minuti, non è leggibile da script (HttpOnly) e in produzione viaggia solo su connessione sicura.',
        'cf_rt — rinnova l\'accesso senza farti rifare il login. Dura fino a 14 giorni, HttpOnly, inviato solo al servizio di autenticazione.',
        'XSRF-TOKEN — protegge i moduli da richieste contraffatte (CSRF). Dura fino alla chiusura del browser.'
      ]
    },
    {
      title: 'Chi visita solo il sito',
      paragraphs: ['Se non accedi all\'area riservata, i cookie cf_at e cf_rt non vengono creati. Il modulo contatti invia i dati solo quando premi "Invia la richiesta".']
    },
    {
      title: 'Come gestirli',
      paragraphs: ['Puoi cancellare o bloccare i cookie dalle impostazioni del browser. Se blocchi quelli tecnici, l\'area riservata non funzionerà. Per le altre informazioni sul trattamento dei dati leggi l\'informativa privacy.']
    }
  ]
};
