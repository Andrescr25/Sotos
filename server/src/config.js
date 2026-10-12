/**
 * Lee la configuración desde variables de entorno (Render las inyecta).
 *
 * | Variable          | Uso                                                           |
 * |-------------------|---------------------------------------------------------------|
 * | PORT              | Puerto HTTP (Render lo define; por defecto 10000)             |
 * | DATABASE_URL      | Postgres (Supabase: Session pooler). Sin ella: memoria, solo desarrollo |
 * | DATABASE_SSL      | "true"/"false". Por defecto: activo salvo en localhost        |
 * | DATABASE_SSL_CA   | Certificado raíz (PEM) para verificar al servidor. Opcional   |
 * | DATABASE_POOL_MAX | Conexiones máximas al pooler (por defecto 5)                  |
 * | ADMIN_USERNAME    | Usuario del primer administrador (solo si aún no hay ninguno) |
 * | ADMIN_PASSWORD    | Contraseña del primer administrador                           |
 * | ADMIN_NAME        | Nombre para mostrar del primer administrador                  |
 * | SESSION_TTL_DAYS  | Duración de una sesión (por defecto 30 días)                  |
 * | BUSINESS_TZ       | Zona horaria que define cuándo reinicia el #consecutivo       |
 * | CORS_ORIGIN       | Orígenes web extra permitidos, separados por coma (o "*").    |
 * |                   | localhost y 127.0.0.1 siempre se permiten (desarrollo)        |
 * | NODE_ENV          | "production" exige DATABASE_URL                               |
 *
 * @param {Record<string, string | undefined>} [env]
 */
export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';
  const warnings = [];

  // Valores pegados a mano en el panel de Render suelen traer comillas o un
  // salto de línea al final; se limpian en vez de fallar con un error críptico.
  const databaseUrl = cleanEnvValue(env.DATABASE_URL) || null;
  if (env.DATABASE_URL && databaseUrl !== env.DATABASE_URL) {
    warnings.push(
      'DATABASE_URL traía comillas, espacios o saltos de línea; se ignoraron. En Render pega el valor sin comillas y en una sola línea.',
    );
  }

  const config = {
    nodeEnv,
    port: Number(env.PORT) || 10000,
    databaseUrl,
    databaseSsl: resolveSsl(env.DATABASE_SSL, databaseUrl),
    // En variables de entorno los saltos de línea suelen venir como "\n" literal.
    databaseSslCa: env.DATABASE_SSL_CA ? env.DATABASE_SSL_CA.replace(/\\n/g, '\n') : null,
    databasePoolMax: Number(env.DATABASE_POOL_MAX) || 5,
    timeZone: env.BUSINESS_TZ || 'America/Costa_Rica',
    corsOrigins: (env.CORS_ORIGIN || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    sessionTtlDays: Number(env.SESSION_TTL_DAYS) || 30,
    inviteTtlDays: Number(env.INVITE_TTL_DAYS) || 7,
    admin: {
      username: cleanEnvValue(env.ADMIN_USERNAME) || null,
      // La contraseña se toma tal cual: podría llevar espacios o comillas a propósito.
      password: env.ADMIN_PASSWORD || null,
      name: cleanEnvValue(env.ADMIN_NAME) || null,
    },
    warnings,
  };

  if (nodeEnv === 'production' && !config.databaseUrl) {
    throw new Error('DATABASE_URL es obligatoria en producción (sin base de datos se perderían los pedidos)');
  }

  return config;
}

/**
 * Quita espacios, saltos de línea y comillas envolventes de un valor de
 * variable de entorno.
 * @param {string | undefined} value
 * @returns {string | undefined}
 */
export function cleanEnvValue(value) {
  if (typeof value !== 'string') return value;
  let cleaned = value.trim();
  const quoted = /^(["'])([\s\S]*)\1$/.exec(cleaned);
  if (quoted) cleaned = quoted[2].trim();
  return cleaned;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function resolveSsl(value, databaseUrl) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (!databaseUrl) return false;
  try {
    // Supabase (y cualquier Postgres remoto) exige cifrado; solo se omite en local.
    return !LOCAL_HOSTS.has(new URL(databaseUrl).hostname);
  } catch {
    return false;
  }
}

/**
 * Opciones para `new pg.Pool(...)`.
 *
 * Con `DATABASE_SSL_CA` el servidor verifica el certificado de la base de
 * datos. Sin él la conexión va cifrada pero sin verificar la identidad del
 * servidor (suficiente para empezar; para endurecer, descarga el certificado
 * raíz desde el panel de Supabase).
 *
 * @param {ReturnType<typeof loadConfig>} config
 */
export function getPoolOptions(config) {
  let ssl;
  if (config.databaseSsl) {
    ssl = config.databaseSslCa
      ? { ca: config.databaseSslCa, rejectUnauthorized: true }
      : { rejectUnauthorized: false };
  }
  return { connectionString: config.databaseUrl, ssl, max: config.databasePoolMax };
}

/**
 * La conexión directa de Supabase (`db.<proyecto>.supabase.co`) solo tiene
 * IPv6, y Render solo IPv4: fallaría. Devuelve un aviso o null.
 * @param {string | null} databaseUrl
 * @returns {string | null}
 */
export function describeConnectionProblem(databaseUrl) {
  if (!databaseUrl) return null;
  try {
    const { hostname } = new URL(databaseUrl);
    if (/^db\.[^.]+\.supabase\.co$/.test(hostname)) {
      return (
        'DATABASE_URL usa la conexión DIRECTA de Supabase (solo IPv6) y Render solo tiene IPv4. ' +
        'Usa la cadena del "Session pooler" (aws-…pooler.supabase.com, puerto 5432).'
      );
    }
  } catch {
    return 'DATABASE_URL no es una URL válida. Si la contraseña tiene caracteres como @ # / debes codificarlos (%40, %23, %2F).';
  }
  return null;
}
