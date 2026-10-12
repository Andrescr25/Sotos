import http from 'node:http';
import { AppError, COMMON_ERROR } from '@/shared/errors/AppError';
import { createAuthService } from './auth/createAuthService';
import { createAuthRoutes } from './http/authRoutes';
import { createRateLimiter } from './http/createRateLimiter';
import { HttpError, getBearerToken, sendJson, statusForCode } from './http/httpUtils';
import { createOrderRoutes } from './http/orderRoutes';
import { createUserRoutes } from './http/userRoutes';
import { createRealtimeHub } from './realtime/createRealtimeHub';

const REALTIME_PATH = '/realtime';
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Arma el servidor HTTP + WebSocket. No abre puertos ni lee el entorno: recibe
 * todo por parámetro, así las pruebas lo levantan en un puerto libre.
 *
 * @param {Object} deps
 * @param {import('./store/contracts').OrderStore} deps.orderStore
 * @param {import('./store/contracts').UserStore} deps.userStore
 * @param {{ timeZone: string, sessionTtlDays?: number, corsOrigin?: string | null, loginRateLimit?: { max: number, windowMs: number } }} deps.config
 * @param {() => Date} [deps.now]
 * @param {number} [deps.heartbeatMs]
 */
export function createApp({ orderStore, userStore, config, now = () => new Date(), heartbeatMs }) {
  const authService = createAuthService({
    userStore,
    sessionTtlMs: (config.sessionTtlDays ?? 30) * DAY_MS,
    now,
  });
  const hub = createRealtimeHub({
    authenticate: (token) => authService.authenticate(token),
    heartbeatMs,
  });
  const rateLimiter = createRateLimiter(config.loginRateLimit ?? { max: 20, windowMs: 60_000 });

  const routes = [
    ...createAuthRoutes({ authService, rateLimiter, hub }),
    ...createUserRoutes({ authService, hub }),
    ...createOrderRoutes({ orderStore, hub, timeZone: config.timeZone, now }),
  ];

  /** CORS solo si se configuró (desarrollo con la app en el navegador). */
  function applyCors(res) {
    if (!config.corsOrigin) return;
    res.setHeader('Access-Control-Allow-Origin', config.corsOrigin);
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
  }

  async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    applyCors(res);

    if (req.method === 'OPTIONS') {
      res.writeHead(config.corsOrigin ? 204 : 404);
      return res.end();
    }

    // Render usa esta ruta para saber si el servicio está vivo.
    if (req.method === 'GET' && url.pathname === '/health') {
      return sendJson(res, 200, { status: 'ok' });
    }

    const route = routes.find(
      (candidate) => candidate.method === req.method && candidate.pattern.test(url.pathname),
    );
    if (!route) throw new HttpError(404, 'not_found', 'Ruta no encontrada');

    let user = null;
    const token = getBearerToken(req);
    if (!route.public) {
      user = await authService.authenticate(token);
      if (!user) {
        throw new AppError(COMMON_ERROR.UNAUTHORIZED, 'Inicia sesión para continuar');
      }
    }

    const params = url.pathname.match(route.pattern).slice(1).map(decodeURIComponent);
    const { status, body } = await route.handler({ req, url, params, user, token });
    return sendJson(res, status, body);
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch((error) => {
      if (error instanceof AppError) {
        const status = error instanceof HttpError ? error.status : statusForCode(error.code);
        sendJson(res, status, { error: { code: error.code, message: error.message } });
        return;
      }
      console.error('Error no controlado', error);
      sendJson(res, 500, {
        error: { code: COMMON_ERROR.INTERNAL, message: 'Error interno del servidor' },
      });
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
    authService,

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
