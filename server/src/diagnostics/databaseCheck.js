/**
 * Diagnóstico de la conexión a la base de datos. Nunca devuelve ni imprime la
 * contraseña: solo datos que se pueden compartir sin riesgo.
 */

const TABLES = ['orders', 'order_counters', 'users', 'sessions'];

/**
 * Resume una DATABASE_URL sin exponer la contraseña.
 * @param {string} databaseUrl
 */
export function describeDatabaseUrl(databaseUrl) {
  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    return { valid: false };
  }

  const host = url.hostname;
  const port = Number(url.port) || 5432;
  const isSupabasePooler = host.endsWith('.pooler.supabase.com');
  const isSupabaseDirect = /^db\.[^.]+\.supabase\.co$/.test(host);

  let mode = null;
  if (isSupabasePooler) mode = port === 6543 ? 'transaction' : 'session';

  return {
    valid: true,
    host,
    port,
    user: decodeURIComponent(url.username),
    database: url.pathname.replace(/^\//, '') || 'postgres',
    hasPassword: url.password.length > 0,
    isSupabasePooler,
    isSupabaseDirect,
    poolerMode: mode,
  };
}

/**
 * ¿Parece un error de la base de datos o de la red (y no, por ejemplo, de
 * configuración)? Los de Postgres traen un código SQLSTATE de 5 caracteres y
 * los de red un código tipo ENOTFOUND.
 * @param {unknown} error
 * @returns {boolean}
 */
export function isDatabaseError(error) {
  const code = error && typeof error === 'object' ? error.code : undefined;
  return typeof code === 'string' && (/^[0-9A-Z]{5}$/.test(code) || /^E[A-Z]{3,}$/.test(code));
}

/**
 * Traduce un error de conexión a una explicación accionable en español.
 * @param {{ code?: string, message?: string }} error
 * @returns {string}
 */
export function explainConnectionError(error) {
  const code = error?.code;
  const message = String(error?.message ?? '');

  if (code === '28P01' || /password authentication failed/i.test(message)) {
    return 'La contraseña es incorrecta. Revisa que en DATABASE_URL sea EXACTAMENTE la de la base de datos (sin comillas, espacios ni saltos de línea). Si dudas, restablécela en Supabase → Database → Settings; y si tiene caracteres especiales (@ # / ? :), codifícalos en la URL (%40, %23, %2F…).';
  }
  if (/tenant or user not found/i.test(message) || code === 'XX000') {
    return 'Supabase no reconoce el usuario. En el Session pooler el usuario es "postgres.<ref-del-proyecto>" (no solo "postgres"). Copia la cadena tal cual desde Connect → Session pooler.';
  }
  if (code === 'ENETUNREACH' || code === 'EHOSTUNREACH') {
    return 'No hay ruta de red al servidor. Si usas la conexión directa de Supabase (solo IPv6) desde una red IPv4, cámbiala por la del Session pooler.';
  }
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return 'No se encontró el servidor (DNS). Revisa que el host de la URL esté bien escrito y que haya internet.';
  }
  if (code === 'ECONNREFUSED') {
    return 'El servidor rechazó la conexión. Revisa host y puerto (Session pooler: 5432).';
  }
  if (code === 'ETIMEDOUT' || /timeout/i.test(message)) {
    return 'La conexión tardó demasiado. Revisa la red; si el proyecto es gratuito, puede estar pausado (reanúdalo en el panel de Supabase).';
  }
  if (/self[- ]signed|certificate/i.test(message)) {
    return 'Problema con el certificado SSL. Si definiste DATABASE_SSL_CA, verifica que sea el certificado raíz del proyecto.';
  }
  return `No se pudo conectar: ${message || code || 'error desconocido'}`;
}

/**
 * Lee del servidor: usuario, versión y estado de las tablas del sistema.
 * @param {{ query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }> }} db
 */
export async function inspectDatabase(db) {
  const who = await db.query('SELECT current_user AS "currentUser", version() AS version');

  const { rows } = await db.query(
    `SELECT c.relname AS name, c.relrowsecurity AS rls
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = ANY($1::text[])`,
    [TABLES],
  );
  const found = new Map(rows.map((row) => [row.name, row.rls]));

  return {
    currentUser: who.rows[0].currentUser,
    version: String(who.rows[0].version).split(',')[0],
    tables: TABLES.map((name) => ({ name, exists: found.has(name), rls: found.get(name) === true })),
  };
}
