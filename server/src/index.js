import pg from 'pg';
import { menuSeed } from '@/data/seed/menu';
import { usersSeed } from '@/data/seed/users';
import { describeConnectionProblem, getPoolOptions, loadConfig } from './config';
import { explainConnectionError, isDatabaseError } from './diagnostics/databaseCheck';
import { createApp } from './createApp';
import { hashPassword } from './security/passwords';
import { createMemoryCashStore } from './store/createMemoryCashStore';
import { createMemoryInventoryStore } from './store/createMemoryInventoryStore';
import { createMemoryMenuStore } from './store/createMemoryMenuStore';
import { createMemoryStore } from './store/createMemoryStore';
import { createMemoryUserStore } from './store/createMemoryUserStore';
import { createPgDb } from './store/createPgDb';
import { createPostgresCashStore } from './store/createPostgresCashStore';
import { createPostgresInventoryStore } from './store/createPostgresInventoryStore';
import { createPostgresMenuStore } from './store/createPostgresMenuStore';
import { createPostgresStore } from './store/createPostgresStore';
import { createPostgresUserStore } from './store/createPostgresUserStore';

/** Cuentas de ejemplo para desarrollo local en memoria (ver data/seed/users). */
async function seedDevelopmentUsers(userStore) {
  for (const { password, ...user } of usersSeed) {
    await userStore.createUser({ ...user, passwordHash: await hashPassword(password) });
  }
}

async function main() {
  const config = loadConfig();
  config.warnings.forEach((warning) => console.warn(`Aviso de configuración: ${warning}`));

  let orderStore;
  let userStore;
  let menuStore;
  let cashStore;
  let inventoryStore;
  const inMemory = !config.databaseUrl;

  if (inMemory) {
    console.warn('DATABASE_URL no definida: usando memoria (los datos se pierden al reiniciar).');
    orderStore = createMemoryStore();
    userStore = createMemoryUserStore();
    // En desarrollo local el menú arranca con datos de ejemplo.
    menuStore = createMemoryMenuStore(menuSeed);
    cashStore = createMemoryCashStore({ orderStore });
    inventoryStore = createMemoryInventoryStore();
  } else {
    const problem = describeConnectionProblem(config.databaseUrl);
    if (problem) console.warn(problem);

    const pool = new pg.Pool(getPoolOptions(config));
    const db = createPgDb(pool);
    orderStore = createPostgresStore(db);
    userStore = createPostgresUserStore(db);
    // En producción el menú empieza vacío: lo arma el administrador.
    menuStore = createPostgresMenuStore(db);
    cashStore = createPostgresCashStore(db);
    inventoryStore = createPostgresInventoryStore(db);
  }

  await orderStore.init();
  await userStore.init();
  await menuStore.init();
  await cashStore.init(); // después de los pedidos: lee su tabla
  await inventoryStore.init();

  const app = createApp({ orderStore, userStore, menuStore, cashStore, inventoryStore, config });

  if (inMemory) {
    await seedDevelopmentUsers(userStore);
    console.log('Cuentas de desarrollo: admin/admin123, cajero/cajero123, cocinero/cocinero123, pendiente/pendiente123');
  }

  const bootstrap = await app.authService.ensureAdmin(config.admin);
  if (bootstrap === 'created' || bootstrap === 'promoted') {
    console.log(`Administrador inicial listo (${bootstrap}): ${config.admin.username}`);
  } else if (bootstrap === 'missing') {
    const message =
      'No hay ningún administrador. Define ADMIN_USERNAME y ADMIN_PASSWORD para crear el primero.';
    if (config.nodeEnv === 'production') throw new Error(message);
    console.warn(message);
  }

  const port = await app.listen(config.port);
  console.log(`Servidor de pedidos escuchando en el puerto ${port}`);

  // Render envía SIGTERM al desplegar o reiniciar y espera ~30 s.
  const shutdown = async (signal) => {
    console.log(`${signal} recibido: cerrando...`);
    await app.close();
    await orderStore.close();
    await userStore.close();
    await menuStore.close();
    await cashStore.close();
    await inventoryStore.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  console.error('No se pudo iniciar el servidor.');
  // Un error de base de datos se explica en español; el detalle técnico solo
  // se muestra si se pide (DEBUG=1) para no llenar el log con el stack.
  console.error(isDatabaseError(error) ? explainConnectionError(error) : error.message);
  if (process.env.DEBUG || !isDatabaseError(error)) console.error(error);
  process.exit(1);
});
