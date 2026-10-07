import pg from 'pg';

async function main() {
  const adminUrl = 'postgresql://neondb_owner:npg_Ze0q5UkiOHWN@ep-snowy-star-b7nt23aw-pooler.c-13.us-east-1.aws.neon.tech/neondb?sslmode=require';
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();

  const check = await client.query("SELECT datname FROM pg_database WHERE datname = 'sissy_hairstyle'");
  if (check.rows.length === 0) {
    await client.query('CREATE DATABASE sissy_hairstyle');
    console.log('✅ Database sissy_hairstyle creato con successo su Neon!');
  } else {
    console.log('ℹ️ Database sissy_hairstyle gia esistente.');
  }
  await client.end();
}

main().catch(console.error);
