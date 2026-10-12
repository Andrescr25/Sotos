import { PGlite } from '@electric-sql/pglite';
import { ORDER_SCHEMA, USER_SCHEMA } from '../store/schema';
import { describeDatabaseUrl, explainConnectionError, inspectDatabase } from './databaseCheck';

const SECRET = 'S3cr3t-NoDebeAparecer';
const POOLER = `postgresql://postgres.abcdefghijkl:${SECRET}@aws-0-us-east-2.pooler.supabase.com:5432/postgres`;

describe('describeDatabaseUrl', () => {
  it('resume la conexión sin exponer la contraseña', () => {
    const summary = describeDatabaseUrl(POOLER);

    expect(summary).toMatchObject({
      valid: true,
      host: 'aws-0-us-east-2.pooler.supabase.com',
      port: 5432,
      user: 'postgres.abcdefghijkl',
      database: 'postgres',
      hasPassword: true,
      isSupabasePooler: true,
      poolerMode: 'session',
    });
    expect(JSON.stringify(summary)).not.toContain(SECRET);
  });

  it('distingue modo transacción y conexión directa', () => {
    expect(describeDatabaseUrl(POOLER.replace(':5432', ':6543')).poolerMode).toBe('transaction');
    expect(describeDatabaseUrl('postgresql://postgres:x@db.abcdefghijkl.supabase.co:5432/postgres').isSupabaseDirect).toBe(true);
  });

  it('decodifica el usuario y detecta URLs inválidas', () => {
    expect(describeDatabaseUrl('postgresql://us%40er:x@host.example.com/db').user).toBe('us@er');
    expect(describeDatabaseUrl('esto no es una url')).toEqual({ valid: false });
  });
});

describe('explainConnectionError', () => {
  it('da una causa y una acción para los fallos típicos', () => {
    expect(explainConnectionError({ code: '28P01' })).toMatch(/contraseña es incorrecta/);
    expect(explainConnectionError({ message: 'Tenant or user not found' })).toMatch(/postgres\.<ref/);
    expect(explainConnectionError({ code: 'ENETUNREACH' })).toMatch(/Session pooler/);
    expect(explainConnectionError({ code: 'ENOTFOUND' })).toMatch(/DNS/);
    expect(explainConnectionError({ code: 'ETIMEDOUT' })).toMatch(/pausado/);
  });

  it('nunca incluye datos de la conexión en el mensaje genérico', () => {
    const text = explainConnectionError(new Error('algo raro'));
    expect(text).toBe('No se pudo conectar: algo raro');
  });
});

describe('inspectDatabase', () => {
  it('informa qué tablas existen y si tienen RLS', async () => {
    const db = new PGlite();

    const before = await inspectDatabase(db);
    expect(before.tables.every((table) => !table.exists)).toBe(true);

    for (const statement of [...USER_SCHEMA, ...ORDER_SCHEMA]) await db.query(statement);

    const after = await inspectDatabase(db);
    expect(after.currentUser).toBeTruthy();
    expect(after.tables).toEqual([
      { name: 'orders', exists: true, rls: true },
      { name: 'order_counters', exists: true, rls: true },
      { name: 'users', exists: true, rls: true },
      { name: 'sessions', exists: true, rls: true },
    ]);
    await db.close();
  });
});
