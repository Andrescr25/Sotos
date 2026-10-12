import { AppError, COMMON_ERROR } from '@/shared/errors/AppError';
import { getClientIp, readJson } from './httpUtils';

/**
 * Registro, inicio y cierre de sesión. `register` y `login` son públicos y
 * están limitados por intentos para frenar la fuerza bruta.
 *
 * @param {Object} deps
 * @param {ReturnType<import('../auth/createAuthService').createAuthService>} deps.authService
 * @param {ReturnType<import('./createRateLimiter').createRateLimiter>} deps.rateLimiter
 * @param {ReturnType<import('../realtime/createRealtimeHub').createRealtimeHub>} deps.hub
 */
export function createAuthRoutes({ authService, rateLimiter, hub }) {
  function limit(req) {
    if (!rateLimiter.allow(getClientIp(req))) {
      throw new AppError(COMMON_ERROR.RATE_LIMITED, 'Demasiados intentos; espera un momento');
    }
  }

  return [
    {
      method: 'POST',
      pattern: /^\/auth\/register$/,
      public: true,
      async handler({ req }) {
        limit(req);
        const session = await authService.register(await readJson(req));
        hub.notifyUsersChanged();
        return { status: 201, body: session };
      },
    },

    {
      method: 'POST',
      pattern: /^\/auth\/login$/,
      public: true,
      async handler({ req }) {
        limit(req);
        const session = await authService.login((await readJson(req)) ?? {});
        return { status: 200, body: session };
      },
    },

    {
      method: 'POST',
      pattern: /^\/auth\/logout$/,
      async handler({ token }) {
        await authService.logout(token);
        return { status: 200, body: { ok: true } };
      },
    },

    {
      method: 'GET',
      pattern: /^\/auth\/me$/,
      async handler({ user }) {
        return { status: 200, body: { user } };
      },
    },
  ];
}
