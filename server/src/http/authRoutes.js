import { AppError, COMMON_ERROR } from '@/shared/errors/AppError';
import { getClientIp, readJson } from './httpUtils';

/**
 * Inicio y cierre de sesión, y enlaces de invitación. No hay registro abierto:
 * las cuentas las crea un administrador. `login` y las dos rutas de
 * invitación son públicas y están limitadas por intentos para frenar la fuerza
 * bruta.
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
      pattern: /^\/auth\/login$/,
      public: true,
      async handler({ req }) {
        limit(req);
        const session = await authService.login((await readJson(req)) ?? {});
        return { status: 200, body: session };
      },
    },

    {
      // Qué cuenta es la del enlace (nombre y rol) antes de crear la contraseña.
      // El token va en el cuerpo y no en la ruta: así no queda en los registros de acceso.
      method: 'POST',
      pattern: /^\/invitations\/lookup$/,
      public: true,
      async handler({ req }) {
        limit(req);
        const { token } = (await readJson(req)) ?? {};
        return { status: 200, body: { invitation: await authService.getInvitation(token) } };
      },
    },

    {
      // El empleado crea su contraseña y queda con la sesión abierta.
      method: 'POST',
      pattern: /^\/invitations\/accept$/,
      public: true,
      async handler({ req }) {
        limit(req);
        const { token, password } = (await readJson(req)) ?? {};
        const session = await authService.acceptInvitation(token, password);
        // La contraseña cambió: las sesiones anteriores ya no existen y sus
        // conexiones en vivo se cierran (la nueva se conecta después).
        hub.disconnectUser(session.user.id);
        hub.notifyUsersChanged();
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
