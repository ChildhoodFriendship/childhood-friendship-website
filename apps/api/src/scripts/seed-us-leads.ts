/**
 * Popola il database con 10 lead USA (attività commerciali, solo dati pubblici della scheda Google).
 * Nessun nome di persona e nessun dato economico stimato: i segnali in `notes` vanno verificati prima del contatto.
 * Se il lead esiste già (stesso telefono) aggiorna SOLO i campi descrittivi: stato, prezzo ed esito del CRM restano intatti.
 * Esecuzione: npm run leads:seed --workspace=@cf/api
 */
import { eq } from 'drizzle-orm';
import { loadEnv } from '../config/env.js';
import { createDb } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';
import { leads } from '../db/schema.js';

const US_LEADS = [
  {
    name: 'President',
    company: 'Quick Key Locksmith LV Inc',
    phone: '+1 702-659-9779',
    category: 'Emergency 24/7 Locksmith & Mobile Dispatch',
    service: 'webapp' as const,
    address: '234 Willow Pond Ct, Las Vegas, NV 89148',
    mapsUrl: 'https://www.google.com/maps/place/Quick+Key+Locksmith+Las+Vegas/@36.0529006,-115.2826935,18.96z',
    website: 'https://quickeylocksmithlasvegas.com',
    priceCents: 325_000, // $3,250.00 (3.000 € netti)
    offeredService: 'Piattaforma di Emergenza Mobile 24/7 con Chiamata Istantanea 1-Tap e Checkout Acconto Apple Pay',
    score: 99,
    status: 'qualificato' as const,
    notes: 'DIAGNOSI TECNICA: Il sito Wix attuale risponde con HTTP 404 Not Found - ConnectYourDomain Error. Chi cerca un fabbro in emergenza trova un sito non raggiungibile. [Segnali da verificare prima del contatto.]',
    outreachMessage: 'Hi there, I noticed your Quick Key Locksmith Google Maps listing is getting searches, but when customers tap your website, it throws a Wix 404 ConnectYourDomain error. Anyone locked out is bouncing to other locksmiths. We can deploy a lightning-fast mobile booking & dispatch app with 1-tap Apple Pay/Card deposits so you secure every call before competitors do. Let\'s fix this today.',
    waLink: 'https://wa.me/17026599779'
  },
  {
    name: 'General Manager',
    company: 'European Auto Repair',
    phone: '+1 702-972-1595',
    category: 'European Luxury Auto Repair (Porsche, BMW, Audi, Maserati)',
    service: 'webapp' as const,
    address: '3530 S Jones Blvd, Las Vegas, NV 89103',
    mapsUrl: 'https://www.google.com/maps/search/European+Auto+Repair+3530+S+Jones+Blvd+Las+Vegas',
    website: '',
    priceCents: 325_000,
    offeredService: 'Portale Digitale Preventivi Veicoli Europei con Targa/VIN e Prenotazione Diagnostica',
    score: 98,
    status: 'qualificato' as const,
    notes: 'ZERO SITO WEB su Maps. 89 recensioni (4.5★). [Segnali da verificare prima del contatto.]',
    outreachMessage: 'Hi team at European Auto Repair, your reputation on S Jones Blvd for European imports is great, but you have zero website linked on your Google profile. High-end BMW, Porsche and Maserati drivers want to book diagnostics online. Our digital booking portal costs $3,250 flat—covered by just 2 brake/transmission jobs. Let\'s get you set up.',
    waLink: 'https://wa.me/17029721595'
  },
  {
    name: 'Operations Manager',
    company: 'Crossbay Car Wash & Lube',
    phone: '+1 718-843-6097',
    category: '24/7 Car Wash & Express Lube',
    service: 'webapp' as const,
    address: '135-18 Cross Bay Blvd, Ozone Park, Queens, NY 11417',
    mapsUrl: 'https://www.google.com/maps/search/Crossbay+Car+Wash+135-18+Cross+Bay+Blvd+Queens+NY',
    website: '',
    priceCents: 325_000,
    offeredService: 'Portale Abbonamenti Mensili Ricorrenti (Unlimited Wash Club) con Addebito Automatico Stripe',
    score: 97,
    status: 'qualificato' as const,
    notes: 'Oltre 1.200 recensioni su Maps. ZERO SITO WEB. Opportunità: abbonamenti mensili online. [Segnali da verificare prima del contatto.]',
    outreachMessage: 'Hi Crossbay Car Wash, you have over 1,200 reviews and hundreds of cars daily in Ozone Park, but zero digital portal to sell recurring monthly Unlimited Wash Club memberships online. Even 100 members paying $39/mo brings $3,900/mo guaranteed recurring revenue. We build the complete system with Apple Pay & card billing for a flat $3,250.',
    waLink: 'https://wa.me/17188436097'
  },
  {
    name: 'Owner / Master Tech',
    company: "702's Garage",
    phone: '+1 702-612-1575',
    category: 'Auto Repair & Diagnostics',
    service: 'webapp' as const,
    address: '4440 S Arville St #8, Las Vegas, NV 89103',
    mapsUrl: "https://www.google.com/maps/search/702's+Garage+4440+Arville+St+Las+Vegas",
    website: '',
    priceCents: 325_000,
    offeredService: 'Piattaforma Web per Prenotazione Tagliandi e Preventivi Trasparenti Online',
    score: 96,
    status: 'qualificato' as const,
    notes: 'Zero sito web. [Segnali da verificare prima del contatto.]',
    outreachMessage: "Hi there, great work at 702's Garage on Arville St. We noticed you have no official website listed on your DMV & Google business profile. Drivers searching nearby can't view your services or book a slot online. We create turnkey booking portals for independent shops at $3,250 flat—paid off in half a day.",
    waLink: 'https://wa.me/17026121575'
  },
  {
    name: 'General Manager',
    company: 'Felix Marble & Granite Fabrication, LLC',
    phone: '+1 702-279-5820',
    category: 'Luxury Stone, Quartz & Granite Countertops',
    service: 'landing' as const,
    address: 'Las Vegas, NV 89141',
    mapsUrl: 'https://www.google.com/maps/search/Felix+Marble+Granite+Fabrication+Las+Vegas',
    website: '',
    priceCents: 325_000,
    offeredService: 'Showroom Digitale Piani Cucina con Calcolatore Preventivi al Metro Quadro',
    score: 96,
    status: 'qualificato' as const,
    notes: 'ZERO SITO WEB. Opportunità: portfolio lavori e richiesta preventivo online. [Segnali da verificare prima del contatto.]',
    outreachMessage: 'Hi Felix Marble & Granite team, you craft high-end stone countertops in Las Vegas, but have zero website for homeowners to browse stone slabs or calculate square-foot estimates. One single kitchen countertop remodel ($5,000+) completely pays for our $3,250 custom digital showcase.',
    waLink: 'https://wa.me/17022795820'
  },
  {
    name: 'Lead Detailing Specialist',
    company: 'Stirrin Mobile Detailing',
    phone: '+1 702-739-4541',
    category: 'High-End Mobile Detailing & Paint Correction',
    service: 'webapp' as const,
    address: '4317 Swift St, Las Vegas (Summerlin), NV 89147',
    mapsUrl: 'https://www.google.com/maps/search/Stirrin+Mobile+Detailing+Las+Vegas',
    website: 'http://stirrindetailing.com',
    priceCents: 325_000,
    offeredService: 'Piattaforma Mobile Detailing con Selezione Pacchetti e Pagamento Anticipato',
    score: 95,
    status: 'qualificato' as const,
    notes: 'DIAGNOSI TECNICA: stirrindetailing.com risponde con HTTP 404 Not Found (Nginx). [Segnali da verificare prima del contatto.]',
    outreachMessage: 'Hi Stirrin Detailing, your website stirrindetailing.com is returning a 404 Nginx Not Found error right now. Summerlin clients trying to book ceramic coatings can\'t reach you. We replace broken sites with a slick mobile booking engine with Apple Pay at $3,250 flat. Let\'s restore your traffic.',
    waLink: 'https://wa.me/17027394541'
  },
  {
    name: 'Owner',
    company: "Nate's The Great Mobile Car Care LLC",
    phone: '+1 786-739-9696',
    category: 'Mobile Detailing & Ceramic Coatings',
    service: 'webapp' as const,
    address: '631 NW 73rd Ln, Miami, FL 33150',
    mapsUrl: "https://www.google.com/maps/search/Nate's+The+Great+Mobile+Car+Care+Miami",
    website: 'http://natesmobiledetailing.com',
    priceCents: 325_000,
    offeredService: 'Piattaforma Detailing & Trattamenti Ceramici Miami con Calendario e Acconto Carta',
    score: 95,
    status: 'qualificato' as const,
    notes: 'DIAGNOSI TECNICA: natesmobiledetailing.com bloccato con Cloudflare Error 1001: DNS resolution error. 97 recensioni (4.5★) ma sito inaccessibile. [Segnali da verificare prima del contatto.]',
    outreachMessage: 'Hi there, your website natesmobiledetailing.com is showing Cloudflare Error 1001 and blocking every customer in Miami. We can fix your DNS and give you a sleek luxury booking app with Apple Pay deposits for $3,250, paid off in less than a day of detailing work.',
    waLink: 'https://wa.me/17867399696'
  },
  {
    name: 'Managing Partner',
    company: 'JBM Custom Upholstery, LLC',
    phone: '+1 702-238-9986',
    category: 'Custom Marine, Automotive & Luxury Furniture Upholstery',
    service: 'landing' as const,
    address: '3140 Polaris Ave STE 48, Las Vegas, NV 89102',
    mapsUrl: 'https://www.google.com/maps/search/JBM+Custom+Upholstery+3140+Polaris+Ave+Las+Vegas',
    website: '',
    priceCents: 325_000,
    offeredService: 'Catalogo Digitale Lavorazioni di Pregio e Modulo Preventivo con Foto',
    score: 94,
    status: 'qualificato' as const,
    notes: 'ZERO SITO WEB. Lavorano su barche e auto da collezione senza un portfolio online. [Segnali da verificare prima del contatto.]',
    outreachMessage: 'Hi JBM Upholstery, you work on custom classic cars and boats off Polaris Ave, but have no standalone website to showcase your leather and upholstery work. High-end owners want to see proof before calling. A clean digital showcase is $3,250 flat—covered by a single boat or car interior.',
    waLink: 'https://wa.me/17022389986'
  },
  {
    name: 'Manager',
    company: 'ABC Complete Auto Repair',
    phone: '+1 702-889-0307',
    category: 'Full Automotive Repair & Inspection',
    service: 'webapp' as const,
    address: '4585 W Nevso Dr, Las Vegas, NV 89103',
    mapsUrl: 'https://www.google.com/maps/search/ABC+Complete+Auto+Repair+4585+W+Nevso+Dr+Las+Vegas',
    website: '',
    priceCents: 325_000,
    offeredService: 'Sito Multilingua con Modulo Prenotazione Rapida e Scheda Interventi',
    score: 94,
    status: 'qualificato' as const,
    notes: 'ZERO SITO WEB. [Segnali da verificare prima del contatto.]',
    outreachMessage: 'Hi ABC Complete Auto Repair, your shop on Nevso Dr is busy, but you have no website for local car owners searching Google Maps nearby. We deploy turnkey garage booking sites with online quote calculators for $3,250 flat.',
    waLink: 'https://wa.me/17028890307'
  },
  {
    name: 'Store Manager',
    company: 'El Chacho Tortas and Birria',
    phone: '+1 702-780-6070',
    category: 'High-Volume Mexican Gourmet & Birria',
    service: 'webapp' as const,
    address: '4161 S Eastern Ave, Las Vegas, NV 89119',
    mapsUrl: 'https://www.google.com/maps/search/El+Chacho+Tortas+and+Birria+Las+Vegas',
    website: '',
    priceCents: 325_000,
    offeredService: 'Portale Ordini Online Take-Away a Zero Commissioni con Pagamento con Carta ed Apple Pay',
    score: 93,
    status: 'qualificato' as const,
    notes: 'Spendono in annunci su Google ma rimandano a profili terzi. Opportunità: ordini online diretti senza commissioni delle piattaforme di delivery. [Segnali da verificare prima del contatto.]',
    outreachMessage: 'Hi El Chacho team, you make the best birria in Vegas with hundreds of orders a day, but you\'re giving away 30% of every order to UberEats and Grubhub because you don\'t have direct online ordering. Our commission-free online ordering system with Apple Pay is $3,250 flat—you save that much in commission fees in your first month alone.',
    waLink: 'https://wa.me/17027806070'
  }
];

async function seed() {
  const env = loadEnv();
  console.log(`Connessione DB: ${env.DATABASE_URL.slice(0, 30)}...`);
  const handle = await createDb(env.DATABASE_URL);
  if (env.DATABASE_URL.startsWith('pglite:')) {
    await runMigrations(handle.db, env.DATABASE_URL);
  }

  let inserted = 0;
  let updated = 0;

  for (const item of US_LEADS) {
    const [existing] = await handle.db
      .select({ id: leads.id })
      .from(leads)
      .where(eq(leads.phone, item.phone));

    if (existing) {
      await handle.db
        .update(leads)
        .set({
          name: item.name,
          notes: item.notes,
          outreachMessage: item.outreachMessage,
          updatedAt: new Date()
        })
        .where(eq(leads.id, existing.id));
      updated++;
      console.log(`[UPDATE] ${item.company} (${item.phone})`);
    } else {
      await handle.db.insert(leads).values({
        ...item,
        source: 'prospezione_usa'
      });
      inserted++;
      console.log(`[INSERT] ${item.company} (${item.phone})`);
    }
  }

  console.log(`\nCompletato! ${inserted} inseriti, ${updated} aggiornati.`);
  await handle.close();
}

seed().catch((err) => {
  console.error('Errore durante il seeding:', err);
  process.exit(1);
});
