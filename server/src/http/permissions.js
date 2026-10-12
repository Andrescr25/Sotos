import { can } from '@/domain/users';
import { AppError, COMMON_ERROR } from '@/shared/errors/AppError';

/**
 * Exige que el usuario autenticado tenga el permiso; si no, 403.
 * El rol sale siempre de la base de datos (sesión), nunca de lo que envíe el cliente.
 * @param {import('@/domain/users/roles').User} user
 * @param {string} permission  uno de PERMISSIONS
 */
export function requirePermission(user, permission) {
  if (!can(user.role, permission)) {
    throw new AppError(COMMON_ERROR.FORBIDDEN, 'Tu rol no tiene permiso para realizar esta acción');
  }
}
