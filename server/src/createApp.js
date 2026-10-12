import http from 'node:http';
import { createKeyChecker } from './http/auth';
import { HttpError, sendJson } from './http/httpUtils';
import { createOrderRoutes } from './http/orderRoutes';
import { createRealtimeHub } from './realtime/createRealtimeHub';

const REALTIME_PATH = '/realtime';

/**
 * Arma el servidor HTTP + WebSocket. No abre puertos ni lee el entorno: recibe
 * todo por parámetro, así las pruebas lo levantan en un puerto libre.
 *
 * @param {Object} deps
 * @param {import('./store/contracts').OrderStore} deps.store
 * @param {{ apiKey: string | null, timeZone: string }} deps.config
 * @param {() => Date} [deps.now]
 * @param {number} [deps.heartbeatMs]
 */
export function createApp({ store, config, now = () => new Date(), heartbeatMs }) {
  const isAuthorized = createKeyChecker(config.apiKey);
  const hub = createRealtimeHub({ isAuthorized, heartbeatMs });
  const routes = createOrderRoutes({ store, hub, timeZone: config.timeZone, now });

  async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');

    // Render usa esta ruta para saber si el servicio está vivo.
    if (req.method === 'GET' && url.pathname === '/health') {
      return sendJson(res, 200, { status: 'ok' });
    }

    if (!isAuthorized(req.headers['x-api-key'])) {
      throw new HttpError(401, 'unauthorized', 'Clave de API inválida');
    }

    for (const route of routes) {
      const match = url.pathname.match(route.pattern);
      if (match && route.method === req.method) {
        const { status, body } = await route.handler({
          req,
          url,
          params: match.slice(1).map(decodeURIComponent),
        });
        return sendJson(res, status, body);
      }
    }
    throw new HttpError(404, 'not_found', 'Ruta no encontrada');
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch((error) => {
      if (error instanceof HttpError) {
        sendJson(res, error.status, { error: { code: error.code, message: error.message } });
        return;
      }
      console.error('Error no controlado', error);
      sendJson(res, 500, { error: { code: 'internal', message: 'Error interno del servidor' } });
    });
  });

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (pathname !== REALTIME_PATH) {
      socket.destroy();
      return;
    }
    hub.handleUpgrade(req, socket, head);
  });

  return {
    server,
    hub,

    /** @returns {Promise<number>} puerto en el que quedó escuchando */
    listen(port = 0) {
      return new Promise((resolve) => {
        server.listen(port, () => resolve(server.address().port));
      });
    },

    async close() {
      await hub.close();
      await new Promise((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections?.();
      });
    },
  };
}
