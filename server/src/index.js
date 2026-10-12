import pg from 'pg';
import { loadConfig } from './config';
import { createApp } from './createApp';
import { createMemoryStore } from './store/createMemoryStore';
import { createPgDb } from './store/createPgDb';
import { createPostgresStore } from './store/createPostgresStore';

async function main() {
  const config = loadConfig();

  let store;
  if (config.databaseUrl) {
    const pool = new pg.Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
      max: 10,
    });
    store = createPostgresStore(createPgDb(pool));
  } else {
    console.warn('DATABASE_URL no definida: usando memoria (los pedidos se pierden al reiniciar).');
    store = createMemoryStore();
  }
  await store.init();

  if (!config.apiKey) {
    console.warn('API_KEY no definida: el servidor acepta cualquier cliente (solo desarrollo).');
  }

  const app = createApp({ store, config });
  const port = await app.listen(config.port);
  console.log(`Servidor de pedidos escuchando en el puerto ${port}`);

  // Render envía SIGTERM al desplegar o reiniciar y espera ~30 s.
  const shutdown = async (signal) => {
    console.log(`${signal} recibido: cerrando...`);
    await app.close();
    await store.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  console.error('No se pudo iniciar el servidor', error);
  process.exit(1);
});
