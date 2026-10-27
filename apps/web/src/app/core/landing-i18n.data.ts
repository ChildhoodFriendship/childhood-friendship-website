export interface LandingTranslations {
  header: {
    services: string;
    about: string;
    method: string;
    projects: string;
    portal: string;
    cta: string;
  };
  hero: {
    kicker: string;
    lines: string[];
    lede: string;
    cta: string;
    scrollAria: string;
  };
  manifesto: {
    srTitle: string;
    text: string;
    sign: string;
  };
  services: {
    title: string;
    subtitle: string;
    note: string;
    askQuote: string;
    items: Array<{
      id: string;
      title: string;
      line: string;
      body: string;
      includes: string[];
      from: string;
    }>;
  };
  about: {
    kicker: string;
    titleL1: string;
    titleL2: string;
    titleL3: string;
    titleL4: string;
    copy1: string;
    copy2: string;
    facts: Array<{ k: string; v: string }>;
  };
  method: {
    kicker: string;
    title: string;
    steps: Array<{ n: string; title: string; text: string; proof: string }>;
  };
  portfolio: {
    kicker: string;
    title: string;
    projects: Array<{
      id: string;
      name: string;
      kind: string;
      line: string;
      what: string;
      done: string[];
      stack: string[];
      device: 'browser' | 'phone' | 'chip';
      link?: { label: string; href: string };
      c1: string;
      c2: string;
      accent: string;
      ink: string;
    }>;
  };
  outro: {
    kicker: string;
    lines: string[][];
    ariaLabel: string;
    directContacts: string;
  };
  contact: {
    eyebrow: string;
    login: string;
    title: string;
    yourProject: string;
    steps: Array<{ id: 'service' | 'timing' | 'budget' | 'project' | 'who' | 'contact'; title: string; short: string }>;
    services: Array<{ value: string; label: string; hint?: string }>;
    timings: Array<{ value: string; label: string }>;
    budgets: Array<{ value: string; label: string }>;
    fieldProjectHint: string;
    fieldProjectPlaceholder: string;
    fieldName: string;
    fieldCompany: string;
    fieldOptional: string;
    fieldEmail: string;
    fieldPhone: string;
    privacyHtml: string;
    btnBack: string;
    btnNext: string;
    btnSubmit: string;
    btnSubmitting: string;
    hintProject: string;
    hintKeys5: string;
    hintKeys4: string;
    hintEnter: string;
    successPill: string;
    successTitle: (name: string) => string;
    successSubcopy: (email: string) => string;
    successDesc: string;
    successCta: string;
    errors: {
      required: string;
      email: string;
      privacy: string;
    };
  };
  footer: {
    quote: string;
    legalAria: string;
    privacy: string;
    cookie: string;
    caveau: string;
  };
}

export const LANDING_TRANSLATIONS: Record<'it' | 'en', LandingTranslations> = {
  it: {
    header: {
      services: 'Cosa facciamo',
      about: 'Chi siamo',
      method: 'Come lavoriamo',
      projects: 'Progetti',
      portal: 'Area clienti',
      cta: 'Parliamone',
    },
    hero: {
      kicker: 'Childhood Friendship, studio di sviluppo software',
      lines: ['Costruiamo', 'esperienze.'],
      lede: "Siti, web app e app mobile su misura per aziende che vogliono farsi ricordare. Dall'idea al lancio, senza scorciatoie.",
      cta: 'Parliamo del tuo progetto',
      scrollAria: 'Scorri al manifesto',
    },
    manifesto: {
      srTitle: 'Il nostro manifesto',
      text: "Ogni progetto parte da una persona con un'idea e poco tempo. Noi la ascoltiamo, la mettiamo in ordine e la trasformiamo in un prodotto che la gente usa davvero. Niente template. Niente scorciatoie. Niente sparizioni dopo il lancio.",
      sign: "Il nome viene da un'amicizia nata da bambini. Il metodo, da anni passati a scrivere codice che deve funzionare il lunedì mattina.",
    },
    services: {
      title: 'Cosa costruiamo',
      subtitle: 'Quattro modi di lavorare insieme. Scegli da dove partire, al resto pensiamo noi.',
      note: 'Hosting, dominio e servizi cloud sono esclusi dai prezzi: li scegliamo insieme e restano intestati a te.',
      askQuote: 'Chiedi un preventivo',
      items: [
        {
          id: 'siti',
          title: 'Siti web e landing page',
          line: 'Il primo incontro con il tuo brand. Deve lasciare il segno.',
          body: 'Progettiamo e sviluppiamo siti veloci, leggibili e riconoscibili, pensati per trasformare una visita in un contatto.',
          includes: ['Design su misura', 'SEO tecnica', 'Caricamento rapido', 'Form e misurazione'],
          from: 'da 400 €',
        },
        {
          id: 'webapp',
          title: 'Web app',
          line: 'Gestionali, portali e piattaforme costruiti sui tuoi processi.',
          body: 'Software che toglie lavoro invece di aggiungerne: dashboard, aree riservate, integrazioni con i sistemi che usi già.',
          includes: ['Analisi dei processi', 'Area clienti e ruoli', 'Integrazioni API', 'Database e backup'],
          from: 'da 800 €',
        },
        {
          id: 'mobile',
          title: 'App mobile',
          line: 'Nella tasca dei tuoi clienti, sempre pronta.',
          body: 'App per iOS e Android con un solo codice: accesso utenti, notifiche e dati sincronizzati con il resto del tuo business.',
          includes: ['iOS e Android', 'Login e profili', 'Notifiche push', 'Pubblicazione sugli store'],
          from: 'da 1.200 €',
        },
        {
          id: 'cura',
          title: 'Cura e crescita',
          line: "Il lancio è l'inizio. Restiamo.",
          body: 'Aggiornamenti, sicurezza, piccoli interventi e nuove funzioni quando servono. Un canone chiaro o interventi a chiamata.',
          includes: ['Aggiornamenti e backup', 'Monitoraggio', 'Modifiche rapide', 'Report sullo stato'],
          from: 'da 20 € / mese',
        },
      ],
    },
    about: {
      kicker: 'Chi siamo',
      titleL1: "L'amicizia ci ha",
      titleL2: 'dato il nome.',
      titleL3: 'La disciplina',
      titleL4: 'ci definisce.',
      copy1: "Siamo amici da quando eravamo bambini. Abbiamo imparato a costruire cose insieme molto prima che diventasse un mestiere, e quel modo di lavorare non l'abbiamo più cambiato.",
      copy2: 'Oggi lo mettiamo al servizio delle aziende: pensiero strategico, design essenziale e ingegneria pragmatica, per trasformare obiettivi complessi in prodotti digitali chiari, utili e pronti a crescere.',
      facts: [
        { k: 'Parli con chi costruisce', v: 'Nessun intermediario: ogni domanda arriva a chi progetta e scrive il codice.' },
        { k: "Un solo team, dall'inizio alla fine", v: 'Strategia, design e sviluppo restano nelle stesse mani. Niente pezzi persi nei passaggi.' },
        { k: "Il lancio è solo l'inizio", v: 'Misuriamo, correggiamo, miglioriamo. E restiamo a un messaggio di distanza.' },
      ],
    },
    method: {
      kicker: 'Il metodo',
      title: 'Come<br />costruiamo',
      steps: [
        { n: '01', title: 'Ascoltiamo', text: 'Prima di scrivere una riga di codice capiamo chi userà il prodotto e cosa deve ottenere il tuo business.', proof: 'Ne esce un documento di obiettivi che approvi tu.' },
        { n: '02', title: 'Progettiamo', text: 'Struttura, flussi e design. Ti mostriamo tutto prima di costruire, così decidi guardando, non immaginando.', proof: 'Prototipo navigabile e preventivo definitivo.' },
        { n: '03', title: 'Costruiamo', text: 'Sviluppo a cicli brevi. Ogni settimana vedi cosa è stato fatto e cosa arriva dopo.', proof: 'Segui tutto dalla tua area clienti.' },
        { n: '04', title: 'Restiamo', text: 'Dopo il lancio misuriamo, correggiamo e miglioriamo. Il progetto cresce e noi restiamo a portata di messaggio.', proof: 'Canone chiaro o interventi a chiamata.' },
      ],
    },
    portfolio: {
      kicker: 'Portfolio',
      title: 'Cose che abbiamo costruito',
      projects: [
        {
          id: 'gelateria',
          name: 'Gelateria da Cristian',
          kind: 'Sito vetrina · Attività locale',
          line: 'Un cono 3D che ti viene incontro.',
          what: 'Landing per una gelateria-caffetteria a Piove di Sacco: il cono fotorealistico in 3D si sovrappone al video del titolare che porge il gelato, poi accompagna lo scroll.',
          done: ['Modello 3D fotorealistico e animato', 'Card con colature e gocce animate', 'SEO locale, FAQ e dati strutturati'],
          stack: ['Three.js', 'JavaScript', 'SEO locale'],
          device: 'browser',
          c1: '#C5E3BE',
          c2: '#FDE8BA',
          accent: '#86BC7B',
          ink: '#2B2A1F',
        },
        {
          id: 'sissy',
          name: 'Sissy HairStyle',
          kind: 'App mobile · Prenotazioni',
          line: 'Prenoti scrivendo come parli.',
          what: 'App per un salone di parrucchieri con area clienti, area staff e pannello del titolare nella stessa base.',
          done: ['Prenotazione in linguaggio naturale', 'Calendario con drag & drop', 'Area staff che si "apre" all’accesso'],
          stack: ['Flutter', 'Firebase (in arrivo)'],
          device: 'phone',
          c1: '#FF7AA8',
          c2: '#7C3AED',
          accent: '#FFE1EC',
          ink: '#FFFFFF',
        },
        {
          id: 'sickfitpro',
          name: 'SickFitPro',
          kind: 'Web app + app · Fitness con AI',
          line: 'Allenamento e nutrizione, su misura.',
          what: 'Piattaforma fitness e nutrizione con coach AI: schede di allenamento, macro personalizzati e tracciamento, sul web e su mobile.',
          done: ['Schede e progressi tracciati', 'Coach AI per allenamento e dieta', 'Web e app dalla stessa piattaforma'],
          stack: ['Next.js', 'Flutter', 'Gemini AI'],
          device: 'phone',
          link: { label: 'sickfitpro.it', href: 'https://sickfitpro.it' },
          c1: '#0F172A',
          c2: '#16A34A',
          accent: '#4ADE80',
          ink: '#FFFFFF',
        },
        {
          id: 'abeona',
          name: 'Abeona',
          kind: 'Piattaforma · Viaggi su misura',
          line: 'Il mondo da girare con un dito.',
          what: 'Itinerari d’autore e viaggi su misura con un globo 3D interattivo, app mobile e un concierge AI.',
          done: ['Globo 3D interattivo', 'App mobile cross-platform', 'Concierge AI per gli itinerari'],
          stack: ['React', 'Three.js', 'Flutter', 'Firebase'],
          device: 'browser',
          c1: '#0B1D3A',
          c2: '#1E3A8A',
          accent: '#D4AF37',
          ink: '#FFFFFF',
        },
        {
          id: 'presenze',
          name: 'Presenze NFC',
          kind: 'IoT · Accessi e presenze',
          line: 'Un badge, un tocco, fatto.',
          what: 'Sistema hardware e software per controllo accessi e presenze: lettori NFC collegati a un backend con automazioni e notifiche.',
          done: ['Lettori NFC su ESP32', 'Backend e storico presenze', 'Automazioni e avvisi'],
          stack: ['ESP32', 'Express', 'PostgreSQL', 'n8n'],
          device: 'chip',
          c1: '#1E1B4B',
          c2: '#312E81',
          accent: '#818CF8',
          ink: '#FFFFFF',
        },
        {
          id: 'cf',
          name: 'Area clienti CF',
          kind: 'Gestionale · Su misura',
          line: 'Il progetto, sempre sotto gli occhi.',
          what: 'La piattaforma con cui seguiamo i clienti: progetti, checklist, documenti da approvare, messaggi e accessi cifrati.',
          done: ['Portale clienti e area admin', 'Documenti con approvazione', 'Credenziali cifrate e log'],
          stack: ['Angular', 'Express', 'PostgreSQL'],
          device: 'browser',
          c1: '#F4F0FF',
          c2: '#C4B5FD',
          accent: '#7C3AED',
          ink: '#120A26',
        },
      ],
    },
    outro: {
      kicker: 'Fine del nostro racconto. Inizio del tuo.',
      lines: [['Il', 'prossimo'], ['lo', 'costruiamo'], ['insieme.']],
      ariaLabel: 'Il prossimo lo costruiamo insieme.',
      directContacts: 'Contatti diretti',
    },
    contact: {
      eyebrow: 'Hai un’idea?',
      login: 'Accedi',
      title: 'Diamo forma a qualcosa <em>che resta.</em>',
      yourProject: 'Il tuo progetto',
      steps: [
        { id: 'service', title: 'Cosa vuoi costruire?', short: 'Progetto' },
        { id: 'timing', title: 'Quando ti servirebbe?', short: 'Tempi' },
        { id: 'budget', title: 'Hai già un budget in mente?', short: 'Budget' },
        { id: 'project', title: 'Raccontaci l’idea in due righe.', short: 'Idea' },
        { id: 'who', title: 'Piacere! Come ti chiami?', short: 'Tu' },
        { id: 'contact', title: 'Dove ti rispondiamo?', short: 'Contatti' },
      ],
      services: [
        { value: 'landing', label: 'Un sito o una landing page', hint: 'Presentarti e farti trovare' },
        { value: 'webapp', label: 'Una web app o un gestionale', hint: 'Processi, aree riservate, dashboard' },
        { value: 'mobile', label: 'Un’app mobile', hint: 'iOS e Android' },
        { value: 'manutenzione', label: 'Seguire un progetto esistente', hint: 'Manutenzione ed evoluzione' },
        { value: 'altro', label: 'Non lo so ancora', hint: 'Ne parliamo insieme' },
      ],
      timings: [
        { value: 'Prima possibile', label: 'Prima possibile' },
        { value: 'Entro 1-3 mesi', label: 'Entro 1-3 mesi' },
        { value: 'Più avanti', label: 'Più avanti, sto pianificando' },
        { value: 'Sto esplorando', label: 'Sto solo esplorando' },
      ],
      budgets: [
        { value: 'Fino a 500 €', label: 'Fino a 500 €' },
        { value: '500 – 2.000 €', label: '500 – 2.000 €' },
        { value: 'Oltre 2.000 €', label: 'Oltre 2.000 €' },
        { value: 'Da definire', label: 'Da definire insieme' },
      ],
      fieldProjectHint: 'Cosa deve fare, per chi, e cosa ti piacerebbe ottenere',
      fieldProjectPlaceholder: 'Es. Un sito per il mio studio con prenotazione delle visite…',
      fieldName: 'Nome e cognome *',
      fieldCompany: 'Azienda',
      fieldOptional: '(facoltativo)',
      fieldEmail: 'Email *',
      fieldPhone: 'Telefono',
      privacyHtml: `Ho letto l'<a href="/privacy" target="_blank" rel="noopener">informativa privacy</a>: i miei dati servono solo a rispondermi e a prepararmi un preventivo.`,
      btnBack: 'Indietro',
      btnNext: 'Avanti',
      btnSubmit: 'Invia la richiesta',
      btnSubmitting: 'Invio in corso…',
      hintProject: 'Ctrl + Invio per proseguire',
      hintKeys5: 'Premi A–E',
      hintKeys4: 'Premi A–D',
      hintEnter: 'Premi Invio ↵',
      successPill: 'RICHIESTA PRESA IN CARICO 🚀',
      successTitle: (name: string) => `Bomba, ${name}! Abbiamo tutto.`,
      successSubcopy: (email: string) => `Lorenzo e Mirko sono già al lavoro sulla tua idea. Presto riceverai un messaggio o un'email a <strong>${email}</strong>.`,
      successDesc: 'Abbiamo predisposto il tuo spazio per seguire il progetto in tempo reale, visualizzare il preventivo commerciale e chattare con noi.',
      successCta: 'Crea o Accedi al tuo Account',
      errors: {
        required: 'Questo campo è obbligatorio.',
        email: 'Inserisci un indirizzo email valido.',
        privacy: "È necessario accettare l'informativa sulla privacy per procedere.",
      },
    },
    footer: {
      quote: 'Codice su misura, radici solide.',
      legalAria: 'Note legali',
      privacy: 'Privacy',
      cookie: 'Cookie',
      caveau: 'Il caveau',
    },
  },
  en: {
    header: {
      services: 'Services',
      about: 'About',
      method: 'Method',
      projects: 'Projects',
      portal: 'Client Portal',
      cta: "Let's talk",
    },
    hero: {
      kicker: 'Childhood Friendship, software development studio',
      lines: ['We build', 'experiences.'],
      lede: 'Bespoke websites, web apps, and mobile applications built for brands that want to stand out. From concept to launch, no shortcuts.',
      cta: 'Talk about your project',
      scrollAria: 'Scroll to manifesto',
    },
    manifesto: {
      srTitle: 'Our manifesto',
      text: 'Every project starts with someone who has an ambition and little time. We listen, bring clarity, and transform it into a product people genuinely use. No templates. No shortcuts. No disappearing after launch.',
      sign: 'The name stems from a childhood friendship. The method, from years writing software that must run reliably every single day.',
    },
    services: {
      title: 'What we build',
      subtitle: 'Four ways to partner with us. Pick where to start, we take care of the rest.',
      note: 'Hosting, domain, and cloud infrastructure are billed at direct cost: we configure them together and they remain 100% in your name.',
      askQuote: 'Request a quote',
      items: [
        {
          id: 'siti',
          title: 'Websites & Landing Pages',
          line: 'The first impression of your brand. Make it unforgettable.',
          body: 'We design and engineer ultra-fast, responsive, and distinctive websites built to convert visitors into loyal clients.',
          includes: ['Custom UI/UX design', 'Technical SEO', 'Lightning performance', 'Forms & conversion tracking'],
          from: 'from $500',
        },
        {
          id: 'webapp',
          title: 'Web Applications',
          line: 'Custom portals, CRMs, and internal platforms built around your operations.',
          body: 'Software that eliminates busywork: interactive client portals, team roles, and seamless integrations with your existing stack.',
          includes: ['Process architecture', 'Client portal & roles', 'API integrations', 'Secure DB & automatic backups'],
          from: 'from $950',
        },
        {
          id: 'mobile',
          title: 'Mobile Applications',
          line: 'In your customers’ pockets, always ready and accessible.',
          body: 'Single-codebase iOS & Android apps: biometric login, push notifications, and real-time syncing with your cloud database.',
          includes: ['iOS & Android native feel', 'Auth & user profiles', 'Push notifications', 'App Store & Play Store deployment'],
          from: 'from $1,400',
        },
        {
          id: 'cura',
          title: 'Care & Growth Retainer',
          line: 'Launch is just day one. We stay by your side.',
          body: 'Continuous maintenance, security audits, fast iterations, and new features whenever needed. Clear monthly retainer or on-demand.',
          includes: ['Updates & cloud backups', '24/7 uptime monitoring', 'Rapid feature iterations', 'Health & performance audits'],
          from: 'from $25 / mo',
        },
      ],
    },
    about: {
      kicker: 'About us',
      titleL1: 'Friendship gave us',
      titleL2: 'our name.',
      titleL3: 'Discipline',
      titleL4: 'defines us.',
      copy1: 'We have been friends since childhood. We learned to build software together long before it became our profession, and that shared mindset never changed.',
      copy2: 'Today we bring that drive to businesses: strategic thinking, minimalist design, and pragmatic engineering to turn complex requirements into clear, resilient digital products.',
      facts: [
        { k: 'Direct access to engineers', v: 'No account managers: every inquiry goes directly to the engineers designing and writing the code.' },
        { k: 'One unified team, end to end', v: 'Strategy, design, and architecture stay in the exact same hands. Zero friction, zero dropped context.' },
        { k: 'Launch is just the start', v: 'We measure, optimize, and scale. And we remain just one ping away whenever you need guidance.' },
      ],
    },
    method: {
      kicker: 'The Method',
      title: 'How we<br />build',
      steps: [
        { n: '01', title: 'Listen', text: 'Before writing a line of code, we clarify who uses the product and what key business milestones must be hit.', proof: 'Documented scope & goals approved by you.' },
        { n: '02', title: 'Design', text: 'Architecture, user flows, and wireframes. We prototype everything first so you decide by clicking, never guessing.', proof: 'Interactive prototype and guaranteed fixed quote.' },
        { n: '03', title: 'Build', text: 'Agile development in rapid iterations. Every week you test live increments deployed to your staging environment.', proof: 'Track live progress in your client portal.' },
        { n: '04', title: 'Support', text: 'Post-launch analytics, performance tuning, and scaling. We stay on call as your dedicated technical partners.', proof: 'Transparent retainer or on-demand support.' },
      ],
    },
    portfolio: {
      kicker: 'Portfolio',
      title: 'Things we have crafted',
      projects: [
        {
          id: 'gelateria',
          name: 'Gelateria da Cristian',
          kind: 'Showcase site · Local business',
          line: 'A photorealistic 3D cone floating towards you.',
          what: 'Interactive landing page for an artisanal gelato shop: a photorealistic 3D cone overlaps the hero video and seamlessly tracks user scroll.',
          done: ['Photorealistic animated 3D model', 'Interactive drip physics & cards', 'Local SEO, schema markup & FAQs'],
          stack: ['Three.js', 'JavaScript', 'Local SEO'],
          device: 'browser',
          c1: '#C5E3BE',
          c2: '#FDE8BA',
          accent: '#86BC7B',
          ink: '#2B2A1F',
        },
        {
          id: 'sissy',
          name: 'Sissy HairStyle',
          kind: 'Mobile App · Appointments',
          line: 'Book visits writing as naturally as you speak.',
          what: 'Unified mobile app for a premium hair salon: client booking, staff scheduler, and owner business analytics in a single codebase.',
          done: ['Natural language appointment booking', 'Drag & drop interactive calendar', 'Role-based staff portal'],
          stack: ['Flutter', 'Firebase (in progress)'],
          device: 'phone',
          c1: '#FF7AA8',
          c2: '#7C3AED',
          accent: '#FFE1EC',
          ink: '#FFFFFF',
        },
        {
          id: 'sickfitpro',
          name: 'SickFitPro',
          kind: 'Web App + Mobile · AI Fitness',
          line: 'Bespoke workouts & nutrition powered by AI.',
          what: 'Fitness and nutrition SaaS platform featuring an AI coach, dynamic workout splits, and macro logging on web & mobile.',
          done: ['Workout routines & progress analytics', 'Gemini AI nutrition & fitness coach', 'Shared web & mobile backend'],
          stack: ['Next.js', 'Flutter', 'Gemini AI'],
          device: 'phone',
          link: { label: 'sickfitpro.it', href: 'https://sickfitpro.it' },
          c1: '#0F172A',
          c2: '#16A34A',
          accent: '#4ADE80',
          ink: '#FFFFFF',
        },
        {
          id: 'abeona',
          name: 'Abeona',
          kind: 'Travel Platform · Bespoke Journeys',
          line: 'Spin the globe at your fingertips.',
          what: 'Curated bespoke travel platform featuring an interactive 3D globe, cross-platform mobile apps, and an AI itinerary concierge.',
          done: ['Interactive WebGL 3D globe', 'Cross-platform mobile experience', 'AI travel itinerary concierge'],
          stack: ['React', 'Three.js', 'Flutter', 'Firebase'],
          device: 'browser',
          c1: '#0B1D3A',
          c2: '#1E3A8A',
          accent: '#D4AF37',
          ink: '#FFFFFF',
        },
        {
          id: 'presenze',
          name: 'Presenze NFC',
          kind: 'IoT · Access Control & Timesheets',
          line: 'One badge, one tap, instantly recorded.',
          what: 'Integrated hardware and software solution for badge attendance and access control with real-time webhooks.',
          done: ['ESP32 NFC hardware readers', 'Real-time attendance backend', 'Automated alerts & webhook triggers'],
          stack: ['ESP32', 'Express', 'PostgreSQL', 'n8n'],
          device: 'chip',
          c1: '#1E1B4B',
          c2: '#312E81',
          accent: '#818CF8',
          ink: '#FFFFFF',
        },
        {
          id: 'cf',
          name: 'CF Client Portal',
          kind: 'Custom Portal · Operations',
          line: 'Your project, always in plain sight.',
          what: 'The platform we built to coordinate client workflows: roadmaps, signoffs, encrypted keys, and live sprint messaging.',
          done: ['Client portal & admin dashboard', 'Document signoff & approval flows', 'Encrypted credentials & audit trail'],
          stack: ['Angular', 'Express', 'PostgreSQL'],
          device: 'browser',
          c1: '#F4F0FF',
          c2: '#C4B5FD',
          accent: '#7C3AED',
          ink: '#120A26',
        },
      ],
    },
    outro: {
      kicker: 'End of our story. Beginning of yours.',
      lines: [['Let\'s', 'build'], ['your', 'next'], ['vision.']],
      ariaLabel: "Let's build your next vision together.",
      directContacts: 'Direct contact',
    },
    contact: {
      eyebrow: 'Have an idea?',
      login: 'Sign in',
      title: 'Let’s build something <em>that lasts.</em>',
      yourProject: 'Your project',
      steps: [
        { id: 'service', title: 'What are you looking to build?', short: 'Project' },
        { id: 'timing', title: 'When do you need it?', short: 'Timeline' },
        { id: 'budget', title: 'What is your target budget?', short: 'Budget' },
        { id: 'project', title: 'Describe your vision in a few lines.', short: 'Idea' },
        { id: 'who', title: 'Nice to meet you! What is your name?', short: 'You' },
        { id: 'contact', title: 'Where should we reach you?', short: 'Contact' },
      ],
      services: [
        { value: 'landing', label: 'A website or landing page', hint: 'Establish your presence & convert visitors' },
        { value: 'webapp', label: 'A web app or internal tool', hint: 'Client portals, dashboards, workflow automation' },
        { value: 'mobile', label: 'A mobile application', hint: 'Native iOS & Android' },
        { value: 'manutenzione', label: 'Support an existing codebase', hint: 'Maintenance & continuous scaling' },
        { value: 'altro', label: 'Not sure yet', hint: "Let's talk through your goals" },
      ],
      timings: [
        { value: 'Prima possibile', label: 'As soon as possible' },
        { value: 'Entro 1-3 mesi', label: 'Within 1–3 months' },
        { value: 'Più avanti', label: 'Further out, currently planning' },
        { value: 'Sto esplorando', label: 'Just exploring options' },
      ],
      budgets: [
        { value: 'Fino a 500 €', label: 'Up to $600' },
        { value: '500 – 2.000 €', label: '$600 – $2,500' },
        { value: 'Oltre 2.000 €', label: '$2,500+' },
        { value: 'Da definire', label: 'To be defined together' },
      ],
      fieldProjectHint: 'What it should do, who it is for, and what outcome you want',
      fieldProjectPlaceholder: 'e.g. A fast bespoke website for my local business with online booking…',
      fieldName: 'Full name *',
      fieldCompany: 'Company',
      fieldOptional: '(optional)',
      fieldEmail: 'Email address *',
      fieldPhone: 'Phone number',
      privacyHtml: `I have read the <a href="/privacy" target="_blank" rel="noopener">privacy policy</a>: my data will only be used to reply and craft a tailored quote.`,
      btnBack: 'Back',
      btnNext: 'Next',
      btnSubmit: 'Submit request',
      btnSubmitting: 'Submitting…',
      hintProject: 'Ctrl + Enter to proceed',
      hintKeys5: 'Press A–E',
      hintKeys4: 'Press A–D',
      hintEnter: 'Press Enter ↵',
      successPill: 'REQUEST RECEIVED 🚀',
      successTitle: (name: string) => `Awesome, ${name}! We have everything.`,
      successSubcopy: (email: string) => `Lorenzo and Mirko are already reviewing your project. You will receive a direct reply at <strong>${email}</strong>.`,
      successDesc: 'Your client portal is ready to track progress in real time, view formal quotes, and chat directly with us.',
      successCta: 'Sign In or Access Portal',
      errors: {
        required: 'This field is required.',
        email: 'Please enter a valid email address.',
        privacy: 'You must accept the privacy policy to continue.',
      },
    },
    footer: {
      quote: 'Bespoke code, rock-solid foundations.',
      legalAria: 'Legal notes',
      privacy: 'Privacy',
      cookie: 'Cookies',
      caveau: 'The vault',
    },
  },
};
