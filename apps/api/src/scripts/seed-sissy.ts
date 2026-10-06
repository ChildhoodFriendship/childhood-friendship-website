import { eq, sql } from 'drizzle-orm';
import { loadEnv } from '../config/env.js';
import { createDb } from '../db/client.js';
import { runMigrations } from '../db/migrate.js';
import { clients, projects, tasks } from '../db/schema.js';

async function seedSissy() {
  const env = loadEnv();
  const handle = await createDb(env.DATABASE_URL);

  if (env.DATABASE_URL.startsWith('pglite:')) {
    await runMigrations(handle.db, env.DATABASE_URL);
  }

  const clientName = 'Sissy HairStyle';
  console.log(`Verifico cliente '${clientName}'...`);

  // 1. Cerca o crea il cliente
  const [existingClient] = await handle.db
    .select()
    .from(clients)
    .where(eq(sql`lower(${clients.name})`, clientName.toLowerCase()));

  let clientId = existingClient?.id;

  if (existingClient) {
    console.log(`Cliente esistente trovato: ${existingClient.name} (${existingClient.id})`);
    await handle.db
      .update(clients)
      .set({
        address: 'Via Roma, 52, 35020 Arzergrande (PD)',
        openingHours: 'Mar–Sab 08:30–20:00 (Lun e Dom Chiuso)',
        contactName: 'Silvia (Sissy)',
        contactEmail: 'sissy@sissyhairstyle.it',
        contactPhone: '+39 351 848 0133',
        notes: 'Salone di parrucchieri cliente e case study agenzia. Include applicazione mobile/web di booking e integrazione Smart Proximity Suite.',
        socialLinks: {
          instagram: 'https://instagram.com/sissy_hairstyle',
          facebook: 'https://facebook.com/sissyhairstyle'
        }
      })
      .where(eq(clients.id, clientId!));
    console.log('Dati anagrafici Sissy HairStyle aggiornati.');
  } else {
    const [newClient] = await handle.db
      .insert(clients)
      .values({
        name: clientName,
        vatNumber: '05241890281',
        address: 'Via Roma, 52, 35020 Arzergrande (PD)',
        openingHours: 'Mar–Sab 08:30–20:00 (Lun e Dom Chiuso)',
        contactName: 'Silvia (Sissy)',
        contactEmail: 'sissy@sissyhairstyle.it',
        contactPhone: '+39 351 848 0133',
        oldWebsite: 'https://sissyhairstyle.it',
        notes: 'Salone di parrucchieri cliente e case study agenzia. Include applicazione mobile/web di booking e integrazione Smart Proximity Suite.',
        socialLinks: {
          instagram: 'https://instagram.com/sissy_hairstyle',
          facebook: 'https://facebook.com/sissyhairstyle'
        }
      })
      .returning();

    clientId = newClient!.id;
    console.log(`Cliente creato con successo: ${newClient!.name} (ID: ${clientId})`);
  }

  // 2. Cerca o crea il progetto collegato
  const projectName = 'Sissy HairStyle — App & Salon Management';
  const [existingProject] = await handle.db
    .select()
    .from(projects)
    .where(eq(projects.clientId, clientId!));

  let projectId = existingProject?.id;

  if (existingProject) {
    console.log(`Progetto esistente trovato: ${existingProject.name} (ID: ${existingProject.id})`);
  } else {
    const [newProj] = await handle.db
      .insert(projects)
      .values({
        clientId: clientId!,
        name: projectName,
        description: 'App Flutter multipiattaforma per prenotazioni con NLP, calendario salone drag-and-drop, dashboard titolare e sincronizzazione appuntamenti.',
        status: 'in_sviluppo',
        isOnline: true,
        targetUrl: 'http://localhost:5000',
        repositoryUrl: 'https://github.com/Lorenzozero/sissy_hairstyle',
        marketingEnabled: true
      })
      .returning();

    projectId = newProj!.id;
    console.log(`Progetto creato con successo: ${newProj!.name} (ID: ${projectId})`);

    // 3. Inserisci task iniziali di checklist
    await handle.db.insert(tasks).values([
      {
        projectId: projectId!,
        title: 'Fix sicurezza credenziali Team/Titolare su app mobile',
        phase: 'realizzazione',
        done: true,
        position: 0
      },
      {
        projectId: projectId!,
        title: 'Integrazione modulo Salon Management su web admin Childhood Friendship',
        phase: 'realizzazione',
        done: false,
        position: 1
      },
      {
        projectId: projectId!,
        title: 'Configurazione persistenza Firebase / API Cloud dedicata per il salone',
        phase: 'realizzazione',
        done: false,
        position: 2
      },
      {
        projectId: projectId!,
        title: 'Consegna Statuetta 3D NFC e attivazione Smart Proximity Review Booster',
        phase: 'rilascio',
        done: false,
        position: 3
      }
    ]);
    console.log('Checklist di progetto popolata con 4 task.');
  }

  await handle.close();
  console.log('✅ Seed Sissy HairStyle completato con successo!');
}

seedSissy().catch((err) => {
  console.error('Errore durante il seed:', err);
  process.exit(1);
});
