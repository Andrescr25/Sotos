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

/**
 * Cierra una tabla a cualquiera que no sea este servidor.
 *
 * En Supabase, las tablas del esquema `public` se exponen por su API REST a
 * quien tenga la URL del proyecto (roles `anon` y `authenticated`) si no
 * tienen RLS. Aquí:
 *   - se activa RLS sin políticas (todo denegado para esos roles), y
 *   - se les quitan los permisos, por si acaso.
 * El servidor se conecta con el rol `postgres` (propietario), que no se ve
 * afectado. En un Postgres normal, sin esos roles, no cambia nada.
 *
 * @param {string} table
 * @returns {string[]}
 */
const lockDown = (table) => [
  `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`,
  `DO $$
   DECLARE role_name text;
   BEGIN
     FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
       IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
         EXECUTE format('REVOKE ALL ON TABLE ${table} FROM %I', role_name);
       END IF;
     END LOOP;
   END $$`,
];

export const ORDER_SCHEMA = [
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
  ...lockDown('orders'),
  ...lockDown('order_counters'),
];

/** Usuarios y sesiones. `users` va antes que `sessions` (clave foránea). */
export const USER_SCHEMA = [
  // role = NULL: cuenta sin acceso asignado todavía.
  `CREATE TABLE IF NOT EXISTS users (
     id            text PRIMARY KEY,
     username      text NOT NULL UNIQUE,
     name          text NOT NULL,
     password_hash text NOT NULL,
     role          text,
     active        boolean NOT NULL DEFAULT true,
     created_at    timestamptz NOT NULL
   )`,
  // Solo se guarda el hash del token de sesión.
  `CREATE TABLE IF NOT EXISTS sessions (
     token_hash text PRIMARY KEY,
     user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created_at timestamptz NOT NULL,
     expires_at timestamptz NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id)`,
  ...lockDown('users'),
  ...lockDown('sessions'),
];
