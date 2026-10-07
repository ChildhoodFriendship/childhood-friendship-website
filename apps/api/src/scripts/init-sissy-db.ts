import pg from 'pg';
import crypto from 'node:crypto';

const SISSY_DB_URL = process.env.SISSY_DATABASE_URL || 'postgresql://neondb_owner:npg_Ze0q5UkiOHWN@ep-snowy-star-b7nt23aw-pooler.c-13.us-east-1.aws.neon.tech/sissy_hairstyle?sslmode=require';

async function hashPassword(plain: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

async function main() {
  const client = new pg.Client({ connectionString: SISSY_DB_URL });
  await client.connect();
  console.log('Connesso al database dedicato sissy_hairstyle...');

  await client.query(`
    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      price NUMERIC(10, 2) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      image_url TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      bio TEXT NOT NULL DEFAULT '',
      tag_color TEXT NOT NULL DEFAULT '#a855f7',
      working_weekdays TEXT NOT NULL DEFAULT '2,3,4,5,6',
      start_time TEXT NOT NULL DEFAULT '08:30',
      end_time TEXT NOT NULL DEFAULT '20:00',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      pin TEXT NOT NULL DEFAULT '1234',
      photo_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS salon_clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      notes TEXT NOT NULL DEFAULT '',
      photo_url TEXT,
      fidelity_points INTEGER NOT NULL DEFAULT 0,
      joined_on TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      service_id TEXT NOT NULL REFERENCES services(id),
      employee_id TEXT NOT NULL REFERENCES employees(id),
      client_id TEXT NOT NULL,
      start_time TIMESTAMP WITH TIME ZONE NOT NULL,
      duration_minutes INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed',
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS salon_auth (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      employee_id TEXT REFERENCES employees(id),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS salon_media (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      data_base64 TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_client_id_fkey;
  `);
  console.log('Tabelle create con successo!');

  // Popolamento iniziale servizi
  const services = [
    { id: 'SV1', name: 'Taglio Donna', category: 'Taglio', duration_minutes: 45, price: 28.00, description: 'Consulenza morfologica, shampoo specifico e taglio personalizzato.' },
    { id: 'SV2', name: 'Taglio Uomo', category: 'Taglio', duration_minutes: 30, price: 20.00, description: 'Taglio a forbice/macchinetta, rifinitura contorni e shampoo rinfrescante.' },
    { id: 'SV3', name: 'Colore Completo', category: 'Colore', duration_minutes: 90, price: 60.00, description: 'Colorazione professionale con copertura totale e formula protettiva.' },
    { id: 'SV4', name: 'Balayage Glamour', category: 'Colore', duration_minutes: 150, price: 110.00, description: 'Schiaritura a mano libera sfumata per effetto naturale e tridimensionale.' },
    { id: 'SV5', name: 'Piega Gloss', category: 'Piega', duration_minutes: 30, price: 18.00, description: 'Piega a phon e spazzola con prodotti di finish lucidante.' },
    { id: 'SV6', name: 'Trattamento Botox Cheratina', category: 'Trattamento', duration_minutes: 40, price: 25.00, description: 'Ricostruzione profonda del fusto alla cheratina vegetale e acido ialuronico.' },
    { id: 'SV7', name: 'Rifinitura Barba Tradizionale', category: 'Barba', duration_minutes: 20, price: 15.00, description: 'Sagomatura a rasoio, panno caldo e olio nutriente da barba.' }
  ];

  for (const s of services) {
    await client.query(`
      INSERT INTO services (id, name, category, duration_minutes, price, description)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET name = $2, category = $3, duration_minutes = $4, price = $5, description = $6
    `, [s.id, s.name, s.category, s.duration_minutes, s.price, s.description]);
  }
  console.log('Servizi salone inseriti/aggiornati.');

  // Popolamento dipendenti
  const employees = [
    { id: 'EM1', name: 'Silvia (Sissy)', role: 'Titolare · Master Stylist', bio: "L'anima del salone. Esperta di consulenze d'immagine e look totali.", tag_color: '#a855f7', working_weekdays: '2,3,4,5,6', start_time: '08:30', end_time: '20:00', pin: '2026' },
    { id: 'EM2', name: 'Giada', role: 'Colorista Senior', bio: 'Maga delle sfumature, del Balayage e delle tonalizzazioni armocromatiche.', tag_color: '#ec4899', working_weekdays: '2,3,4,5,6', start_time: '08:30', end_time: '19:30', pin: '1234' },
    { id: 'EM3', name: 'Marco', role: 'Barber & Stylist Uomo', bio: "Specializzato in sfumature razor fade e cura della barba all'italiana.", tag_color: '#3b82f6', working_weekdays: '3,4,5,6', start_time: '10:00', end_time: '20:00', pin: '1234' }
  ];

  for (const e of employees) {
    await client.query(`
      INSERT INTO employees (id, name, role, bio, tag_color, working_weekdays, start_time, end_time, pin)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET name = $2, role = $3, bio = $4, tag_color = $5, working_weekdays = $6, start_time = $7, end_time = $8, pin = $9
    `, [e.id, e.name, e.role, e.bio, e.tag_color, e.working_weekdays, e.start_time, e.end_time, e.pin]);
  }
  console.log('Dipendenti salone inseriti/aggiornati.');

  // Popolamento account titolare Silvia per login reale
  const ownerHash = await hashPassword('Sissy2026!');
  await client.query(`
    INSERT INTO salon_auth (id, username, password_hash, role, employee_id)
    VALUES ('auth-silvia', 'sissy', $1, 'owner', 'EM1')
    ON CONFLICT (username) DO UPDATE SET password_hash = $1
  `, [ownerHash]);

  const ownerEmailHash = await hashPassword('Sissy2026!');
  await client.query(`
    INSERT INTO salon_auth (id, username, password_hash, role, employee_id)
    VALUES ('auth-silvia-email', 'sissy@sissyhairstyle.it', $1, 'owner', 'EM1')
    ON CONFLICT (username) DO UPDATE SET password_hash = $1
  `, [ownerEmailHash]);

  console.log('Account reale titolare (sissy / Sissy2026!) registrato.');

  await client.end();
  console.log('✅ Inizializzazione completata con successo nel DB dedicato sissy_hairstyle!');
}

main().catch(console.error);
