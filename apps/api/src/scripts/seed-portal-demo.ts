/**
 * Inizializza un cliente, un progetto e un utente demo nel DB Neon
 * per consentire il login e la visualizzazione del portale cliente.
 */
import { eq } from 'drizzle-orm';
import { loadEnv } from '../config/env.js';
import { createDb } from '../db/client.js';
import { clients, projects, users } from '../db/schema.js';
import { hashPassword } from '../lib/crypto.js';

async function seedPortalDemo() {
  const env = loadEnv();
  console.log(`Connessione DB: ${env.DATABASE_URL.slice(0, 35)}...`);
  const handle = await createDb(env.DATABASE_URL);

  // 1. Cliente Quick Key Locksmith LV Inc
  const [existingClient] = await handle.db
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.name, 'Quick Key Locksmith LV Inc'));

  let clientId = existingClient?.id;
  if (!clientId) {
    const [c] = await handle.db
      .insert(clients)
      .values({
        name: 'Quick Key Locksmith LV Inc',
        address: '234 Willow Pond Ct, Las Vegas, NV 89148',
        contactName: 'Hen Biton',
        contactEmail: 'client@quickeylocksmith.com',
        contactPhone: '+1 702-659-9779',
        notes: 'Cliente USA - Fabbro Pronto Intervento 24/7 Las Vegas. Preventivo $3.250 in 2 tranche.'
      })
      .returning();
    clientId = c!.id;
    console.log(`[CLIENTE CREATO] ${c!.name} (${clientId})`);
  } else {
    console.log(`[CLIENTE ESISTENTE] ID: ${clientId}`);
  }

  // 2. Progetto per il cliente
  const [existingProj] = await handle.db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.clientId, clientId));

  let projectId = existingProj?.id;
  const quoteItems = [
    { id: 'item-1', name: 'Emergency 24/7 Dispatch Architecture & 1-Tap Calling', priceCents: 180_000, monthly: false },
    { id: 'item-2', name: 'Apple Pay & Stripe Real-Time Retainer Checkout Gateway', priceCents: 85_000, monthly: false },
    { id: 'item-3', name: 'High-Speed Mobile PWA & Nevada Local SEO Engine', priceCents: 60_000, monthly: false }
  ];

  if (!projectId) {
    const [p] = await handle.db
      .insert(projects)
      .values({
        clientId,
        name: 'Quick Key Locksmith - 24/7 Mobile Dispatch Portal',
        description: 'Bespoke mobile dispatch web app with 1-tap emergency calling and instant deposit checkout for Las Vegas & Henderson.',
        status: 'in_sviluppo',
        type: 'webapp',
        paidAmountCents: 0, // In attesa di Tranche 1 Acconto
        paymentDeadline: '2026-11-15',
        deadline: '2026-11-15',
        stagingUrl: 'https://quickeylocksmith-staging.vercel.app',
        quoteItems
      })
      .returning();
    projectId = p!.id;
    console.log(`[PROGETTO CREATO] ${p!.name} (${projectId})`);
  } else {
    await handle.db
      .update(projects)
      .set({
        quoteItems,
        paidAmountCents: 0
      })
      .where(eq(projects.id, projectId));
    console.log(`[PROGETTO AGGIORNATO] ID: ${projectId}`);
  }

  // 3. Utente Cliente (per fare login al portale)
  const clientEmail = 'client@quickeylocksmith.com';
  const passwordHash = await hashPassword('Password123!');
  const [existingUser] = await handle.db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, clientEmail));

  if (!existingUser) {
    const [u] = await handle.db
      .insert(users)
      .values({
        email: clientEmail,
        name: 'Hen Biton',
        passwordHash,
        role: 'client',
        clientId,
        isActive: true
      })
      .returning();
    console.log(`[UTENTE CLIENTE CREATO] ${u!.email} (${u!.id})`);
  } else {
    await handle.db
      .update(users)
      .set({ passwordHash, role: 'client', clientId, isActive: true })
      .where(eq(users.id, existingUser.id));
    console.log(`[UTENTE CLIENTE AGGIORNATO] ${clientEmail}`);
  }

  // 4. Utente Admin
  const adminEmail = 'admin@childhood.it';
  const [existingAdmin] = await handle.db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, adminEmail));

  if (!existingAdmin) {
    const [a] = await handle.db
      .insert(users)
      .values({
        email: adminEmail,
        name: 'Lorenzo Garoffolo',
        passwordHash,
        role: 'admin',
        isActive: true
      })
      .returning();
    console.log(`[ADMIN CREATO] ${a!.email} (${a!.id})`);
  } else {
    await handle.db
      .update(users)
      .set({ passwordHash, role: 'admin', isActive: true })
      .where(eq(users.id, existingAdmin.id));
    console.log(`[ADMIN AGGIORNATO] ${adminEmail}`);
  }

  console.log(`\n===========================================`);
  console.log(`PORTALE PRONTO!`);
  console.log(`Project ID: ${projectId}`);
  console.log(`Login Cliente: ${clientEmail} / Password123!`);
  console.log(`Login Admin: ${adminEmail} / Password123!`);
  console.log(`Link Diretto Progetto: /portale/progetti/${projectId}?lang=en`);
  console.log(`===========================================\n`);

  await handle.close();
}

seedPortalDemo().catch((err) => {
  console.error('Errore seed demo:', err);
  process.exit(1);
});
