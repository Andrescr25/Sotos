/**
 * Esquema de Postgres. Cada sentencia es idempotente (IF NOT EXISTS), así que
 * se ejecuta al arrancar sin necesidad de un sistema de migraciones.
 *
 * `orders.data` guarda el pedido completo (JSONB); las demás columnas existen
 * solo para filtrar y ordenar sin abrir el JSON.
 *
 * Cuando el esquema deba cambiar de forma incompatible, agregar migraciones
 * numeradas aquí en lugar de editar estas sentencias.
 */
export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS orders (
     id            text PRIMARY KEY,
     number        integer NOT NULL,
     status        text NOT NULL,
     created_by_id text NOT NULL,
     created_at    timestamptz NOT NULL,
     updated_at    timestamptz NOT NULL,
     data          jsonb NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS orders_status_created_idx ON orders (status, created_at)`,
  `CREATE TABLE IF NOT EXISTS order_counters (
     day         date PRIMARY KEY,
     last_number integer NOT NULL
   )`,
];
