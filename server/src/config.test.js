import { cleanEnvValue, describeConnectionProblem, getPoolOptions, loadConfig } from './config';

const POOLER = 'postgresql://postgres.abcdefghijkl:secreta@aws-0-us-east-1.pooler.supabase.com:5432/postgres';
const DIRECT = 'postgresql://postgres:secreta@db.abcdefghijkl.supabase.co:5432/postgres';

describe('loadConfig', () => {
  it('en desarrollo funciona sin base de datos (memoria)', () => {
    const config = loadConfig({});
    expect(config).toMatchObject({ nodeEnv: 'development', port: 10000, databaseUrl: null, databaseSsl: false });
  });

  it('en producción exige DATABASE_URL', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/DATABASE_URL/);
    expect(() => loadConfig({ NODE_ENV: 'production', DATABASE_URL: POOLER })).not.toThrow();
  });

  it('activa SSL para bases remotas como Supabase y no para localhost', () => {
    expect(loadConfig({ DATABASE_URL: POOLER }).databaseSsl).toBe(true);
    expect(loadConfig({ DATABASE_URL: 'postgres://u:p@localhost:5432/db' }).databaseSsl).toBe(false);
    expect(loadConfig({ DATABASE_URL: 'postgres://u:p@127.0.0.1:5432/db' }).databaseSsl).toBe(false);
  });

  it('DATABASE_SSL manda sobre la detección automática', () => {
    expect(loadConfig({ DATABASE_URL: POOLER, DATABASE_SSL: 'false' }).databaseSsl).toBe(false);
    expect(loadConfig({ DATABASE_URL: 'postgres://u:p@localhost/db', DATABASE_SSL: 'true' }).databaseSsl).toBe(true);
  });

  it('limita las conexiones al pooler (5 por defecto, configurable)', () => {
    expect(loadConfig({ DATABASE_URL: POOLER }).databasePoolMax).toBe(5);
    expect(loadConfig({ DATABASE_URL: POOLER, DATABASE_POOL_MAX: '3' }).databasePoolMax).toBe(3);
  });
});

describe('getPoolOptions', () => {
  it('cifra sin verificar identidad por defecto', () => {
    const options = getPoolOptions(loadConfig({ DATABASE_URL: POOLER }));
    expect(options).toEqual({
      connectionString: POOLER,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  });

  it('con certificado raíz verifica al servidor (acepta \\n literales)', () => {
    const options = getPoolOptions(
      loadConfig({ DATABASE_URL: POOLER, DATABASE_SSL_CA: '-----BEGIN CERTIFICATE-----\\nABC\\n-----END CERTIFICATE-----' }),
    );
    expect(options.ssl.rejectUnauthorized).toBe(true);
    expect(options.ssl.ca).toBe('-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----');
  });

  it('sin SSL no envía opciones de cifrado', () => {
    expect(getPoolOptions(loadConfig({ DATABASE_URL: 'postgres://u:p@localhost/db' })).ssl).toBeUndefined();
  });
});

describe('describeConnectionProblem', () => {
  it('avisa de la conexión directa de Supabase (IPv6) frente a Render (IPv4)', () => {
    expect(describeConnectionProblem(DIRECT)).toMatch(/Session pooler/);
  });

  it('no molesta con el pooler ni sin URL', () => {
    expect(describeConnectionProblem(POOLER)).toBeNull();
    expect(describeConnectionProblem(null)).toBeNull();
  });

  it('avisa de una URL inválida (contraseña con caracteres sin codificar)', () => {
    // Un "#" sin codificar corta la URL: no se puede leer el puerto.
    expect(describeConnectionProblem('postgresql://postgres:pa#ss@host.example.com:5432/postgres')).toMatch(
      /no es una URL válida/,
    );
    expect(describeConnectionProblem('esto no es una url')).toMatch(/no es una URL válida/);
    // Codificada (%23) sí es válida.
    expect(describeConnectionProblem('postgresql://postgres:pa%23ss@host.example.com:5432/postgres')).toBeNull();
  });
});

describe('cleanEnvValue / valores pegados a mano', () => {
  it('quita comillas, espacios y saltos de línea', () => {
    expect(cleanEnvValue('  hola  ')).toBe('hola');
    expect(cleanEnvValue('"hola"')).toBe('hola');
    expect(cleanEnvValue("'hola'")).toBe('hola');
    expect(cleanEnvValue('"hola\n"')).toBe('hola');
    expect(cleanEnvValue(undefined)).toBeUndefined();
  });

  it('DATABASE_URL con comillas y salto de línea (como se pega en Render) se corrige y avisa', () => {
    const config = loadConfig({ DATABASE_URL: `"${POOLER}\n"` });

    expect(config.databaseUrl).toBe(POOLER);
    expect(config.warnings).toHaveLength(1);
    expect(config.warnings[0]).toMatch(/sin comillas/);
  });

  it('un valor limpio no genera avisos', () => {
    expect(loadConfig({ DATABASE_URL: POOLER }).warnings).toEqual([]);
  });

  it('no altera la contraseña del administrador', () => {
    const config = loadConfig({ ADMIN_USERNAME: ' dueno\n', ADMIN_PASSWORD: ' con espacios ' });
    expect(config.admin.username).toBe('dueno');
    expect(config.admin.password).toBe(' con espacios ');
  });
});
