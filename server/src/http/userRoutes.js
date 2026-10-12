import { PERMISSIONS } from '@/domain/users';
import { HttpError, readJson } from './httpUtils';
import { requirePermission } from './permissions';

/**
 * Gestión de usuarios (solo administrador): ver cuentas, asignar rol y
 * habilitar o deshabilitar.
 *
 * @param {Object} deps
 * @param {ReturnType<import('../auth/createAuthService').createAuthService>} deps.authService
 * @param {ReturnType<import('../realtime/createRealtimeHub').createRealtimeHub>} deps.hub
 */
export function createUserRoutes({ authService, hub }) {
  return [
    {
      method: 'GET',
      pattern: /^\/users$/,
      async handler({ user }) {
        requirePermission(user, PERMISSIONS.USER_MANAGE);
        return { status: 200, body: { users: await authService.listUsers() } };
      },
    },

    {
      // El administrador crea la cuenta de un empleado y recibe su enlace.
      method: 'POST',
      pattern: /^\/users$/,
      async handler({ req, user }) {
        requirePermission(user, PERMISSIONS.USER_MANAGE);
        const body = (await readJson(req)) ?? {};
        const created = await authService.createAccount(body, user.id);

        hub.notifyUsersChanged();
        return { status: 201, body: created };
      },
    },

    {
      // Enlace nuevo para una cuenta existente: invitación perdida o contraseña olvidada.
      method: 'POST',
      pattern: /^\/users\/([^/]+)\/invitation$/,
      async handler({ params, user }) {
        requirePermission(user, PERMISSIONS.USER_MANAGE);
        const created = await authService.createInvitation(params[0], user.id);

        hub.notifyUsersChanged();
        return { status: 201, body: created };
      },
    },

    {
      method: 'PATCH',
      pattern: /^\/users\/([^/]+)$/,
      async handler({ req, params, user }) {
        requirePermission(user, PERMISSIONS.USER_MANAGE);
        const body = await readJson(req);
        if (!body || typeof body !== 'object') {
          throw new HttpError(400, 'bad_json', 'Falta el cuerpo de la solicitud');
        }

        const changes = {};
        if ('role' in body) changes.role = body.role;
        if ('active' in body) changes.active = body.active;

        const updated = await authService.setAccess(params[0], changes);

        // La persona afectada se entera al instante (su pantalla cambia sola).
        hub.notifyUserUpdated(updated);
        hub.notifyUsersChanged();
        return { status: 200, body: { user: updated } };
      },
    },
  ];
}
