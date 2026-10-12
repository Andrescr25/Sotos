/**
 * Lee la configuración desde variables de entorno (Render las inyecta).
 *
 * | Variable        | Uso                                                        |
 * |-----------------|------------------------------------------------------------|
 * | PORT            | Puerto HTTP (Render lo define; por defecto 10000)          |
 * | DATABASE_URL    | Postgres. Sin ella se usa memoria (solo desarrollo)        |
 * | DATABASE_SSL    | "true"/"false". Por defecto: activo si el host es render.com |
 * | API_KEY         | Clave compartida que deben enviar las tablets              |
 * | BUSINESS_TZ     | Zona horaria que define cuándo reinicia el #consecutivo    |
 * | NODE_ENV        | "production" exige DATABASE_URL y API_KEY                  |
 *
 * @param {Record<string, string | undefined>} [env]
 */
export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';
  const databaseUrl = env.DATABASE_URL || null;

  const config = {
    nodeEnv,
    port: Number(env.PORT) || 10000,
    databaseUrl,
    databaseSsl: resolveSsl(env.DATABASE_SSL, databaseUrl),
    apiKey: env.API_KEY || null,
    timeZone: env.BUSINESS_TZ || 'America/Costa_Rica',
  };

  if (nodeEnv === 'production') {
    if (!config.databaseUrl) {
      throw new Error('DATABASE_URL es obligatoria en producción (sin base de datos se perderían los pedidos)');
    }
    if (!config.apiKey) {
      throw new Error('API_KEY es obligatoria en producción');
    }
  }

  return config;
}

function resolveSsl(value, databaseUrl) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (!databaseUrl) return false;
  try {
    return new URL(databaseUrl).hostname.endsWith('render.com');
  } catch {
    return false;
  }
}
