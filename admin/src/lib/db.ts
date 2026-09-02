import { Pool } from '@neondatabase/serverless';

const dbUrl = process.env.DATABASE_URL ?? import.meta.env.DATABASE_URL;

let pool: Pool | null = null;

export function getDb(): Pool {
  if (!dbUrl) throw new Error('DATABASE_URL no está configurada');
  if (!pool) pool = new Pool({ connectionString: dbUrl });
  return pool;
}