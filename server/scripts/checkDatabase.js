/**
 * Verifica la conexión del servidor con la base de datos (Supabase).
 *
 *   DATABASE_URL='postgresql://...' npm run server:check-db            solo revisa
 *   DATABASE_URL='postgresql://...' npm run server:check-db -- --init  además crea las tablas
 *
 * No imprime la contraseña. Pensado para ejecutarse en la computadora de
 * quien administra, antes de desplegar.
 */
import pg from 'pg';
import { describeConnectionProblem, getPoolOptions, loadConfig } from '../src/config';
import {
  describeDatabaseUrl,
  explainConnectionError,
  inspectDatabase,
} from '../src/diagnostics/databaseCheck';
import { createPgDb } from '../src/store/createPgDb';
import { createPostgresStore } from '../src/store/createPostgresStore';
import { createPostgresUserStore } from '../src/store/createPostgresUserStore';

const ok = (text) => console.log(`  ✓ ${text}`);
const bad = (text) => console.log(`  ✗ ${text}`);
const info = (text) => console.log(`  · ${text}`);

async function main() {
  const shouldInit = process.argv.includes('--init');
  const config = loadConfig({ ...process.env, NODE_ENV: 'development' });

  console.log('\nVerificación de la base de datos\n');

  if (!config.databaseUrl) {
    bad('Falta DATABASE_URL.');
    info("Ejemplo: DATABASE_URL='postgresql://postgres.<ref>:<CONTRASEÑA>@aws-0-<region>.pooler.supabase.com:5432/postgres'");
    process.exitCode = 1;
    return;
  }

  const target = describeDatabaseUrl(config.databaseUrl);
  if (!target.valid) {
    bad('DATABASE_URL no es una URL válida (¿contraseña con @ # / sin codificar?).');
    process.exitCode = 1;
    return;
  }

  info(`Servidor:  ${target.host}:${target.port}`);
  info(`Usuario:   ${target.user}`);
  info(`Base:      ${target.database}`);
  info(`Cifrado:   ${config.databaseSsl ? (config.databaseSslCa ? 'sí, verificando certificado' : 'sí (sin verificar certificado)') : 'no'}`);
  if (target.isSupabasePooler) info(`Pooler:    Session pooler de Supabase, modo ${target.poolerMode}`);
  if (!target.hasPassword) bad('La URL no incluye contraseña.');

  const problem = describeConnectionProblem(config.databaseUrl);
  if (problem) bad(problem);
  if (target.isSupabasePooler && target.poolerMode === 'transaction') {
    info('Modo "transaction" (6543): funciona, pero para el servidor se recomienda "session" (5432).');
  }

  const pool = new pg.Pool({ ...getPoolOptions(config), max: 1 });
  const db = createPgDb(pool);

  try {
    console.log('\nConexión');
    let report = await inspectDatabase(db);
    ok(`Conectado como "${report.currentUser}" — ${report.version}`);

    if (shouldInit) {
      console.log('\nCreando tablas (--init)');
      await createPostgresStore(db).init();
      await createPostgresUserStore(db).init();
      ok('Esquema aplicado.');
      report = await inspectDatabase(db);
    }

    console.log('\nTablas');
    for (const table of report.tables) {
      if (!table.exists) {
        info(`${table.name}: no existe todavía (se crea al arrancar el servidor, o usa --init)`);
      } else if (table.rls) {
        ok(`${table.name}: existe, con RLS activado`);
      } else {
        bad(`${table.name}: existe SIN RLS — expuesta por la API de Supabase. Arranca el servidor o usa --init.`);
        process.exitCode = 1;
      }
    }

    const { rows } = report.tables.every((table) => table.exists)
      ? await db.query(`SELECT count(*)::int AS total FROM users WHERE role = 'admin' AND active`)
      : { rows: [{ total: null }] };
    if (rows[0].total !== null) {
      console.log('\nAdministrador');
      if (rows[0].total > 0) ok(`Hay ${rows[0].total} administrador(es) activo(s).`);
      else info('Todavía no hay administrador: se crea al arrancar con ADMIN_USERNAME y ADMIN_PASSWORD.');
    }

    console.log('\nListo: la conexión funciona.\n');
  } catch (error) {
    bad(explainConnectionError(error));
    process.exitCode = 1;
  } finally {
    await pool.end().catch(() => {});
  }
}

main();
