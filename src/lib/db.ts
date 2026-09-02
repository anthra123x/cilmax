// Capa de acceso a datos del backend CilMax (Neon Postgres).
// Usa el pool serverless de @neondatabase/serverless. Se crea una sola
// instancia por invocacion de la funcion (cacheada en el modulo).

import { Pool } from '@neondatabase/serverless';

let _pool: Pool | undefined;

export function getDb(): Pool {
  if (!_pool) {
    const connectionString =
      process.env.DATABASE_URL ?? (import.meta.env.DATABASE_URL as string | undefined);
    if (!connectionString) {
      throw new Error('DATABASE_URL no está definida (serverless: revisa las env vars).');
    }
    _pool = new Pool({ connectionString });
  }
  return _pool;
}