// Aplica migraciones SQL (db/migrations/*.sql) en orden contra la base de
// datos definida en DATABASE_URL (Neon). Las aplicadas se registran en
// `schema_migrations`. Uso: npm run migrate

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Falta DATABASE_URL. Copia .env.example a .env y rellena la cadena de Neon.');
  process.exit(1);
}

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db', 'migrations');

const pool = new Pool({ connectionString });

async function main() {
  await pool.query(`create table if not exists schema_migrations (
    filename text primary key,
    applied_at timestamptz not null default now()
  )`);

  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const done = await pool.query('select 1 from schema_migrations where filename = $1', [file]);
    if (done.rowCount) {
      console.log(`- ya aplicada: ${file}`);
      continue;
    }
    const sql = await readFile(path.join(migrationsDir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('insert into schema_migrations (filename) values ($1)', [file]);
      await client.query('commit');
      console.log(`+ aplicada: ${file}`);
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  console.log('Migraciones al día.');
  await pool.end();
}

main().catch((error) => {
  console.error('Error ejecutando migraciones:', error);
  process.exit(1);
});