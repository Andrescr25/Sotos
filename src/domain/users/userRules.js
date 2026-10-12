import { isRole } from './roles';
import { USER_ERROR, UserError } from './userErrors';

export const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_MAX_LENGTH = 100;
const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;

/**
 * El usuario es siempre en minúsculas y sin espacios en los extremos.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeUsername(value) {
  return String(value ?? '').trim().toLowerCase();
}

/**
 * Valida y limpia los datos de registro. Lanza UserError si algo no es válido.
 * @param {{ name?: unknown, username?: unknown, password?: unknown }} input
 * @returns {{ name: string, username: string, password: string }}
 */
export function validateRegistration(input) {
  const name = String(input?.name ?? '').trim().replace(/\s+/g, ' ');
  const username = normalizeUsername(input?.username);
  const password = String(input?.password ?? '');

  if (name.length < 2 || name.length > 60) {
    throw new UserError(USER_ERROR.INVALID_NAME, 'El nombre debe tener entre 2 y 60 caracteres');
  }
  if (!USERNAME_PATTERN.test(username)) {
    throw new UserError(
      USER_ERROR.INVALID_USERNAME,
      'El usuario debe tener entre 3 y 30 caracteres: letras, números, punto, guion o guion bajo',
    );
  }
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    throw new UserError(
      USER_ERROR.INVALID_PASSWORD,
      `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
    );
  }
  return { name, username, password };
}

const isActiveAdmin = (user) => user.active && user.role === 'admin';

/**
 * Aplica un cambio de acceso (rol y/o habilitación) a un usuario respetando
 * las reglas: el rol debe existir (o ser null para quitar el acceso) y siempre
 * debe quedar al menos un administrador activo.
 *
 * Es pura: devuelve el usuario ya actualizado; quien persiste debe hacerlo
 * dentro de la misma operación atómica en la que leyó `users`.
 *
 * @param {import('./roles').User[]} users  todos los usuarios, tal como están guardados
 * @param {string} targetId
 * @param {{ role?: string | null, active?: boolean }} changes
 * @returns {import('./roles').User}
 */
export function applyAccessChange(users, targetId, changes) {
  const target = users.find((user) => user.id === targetId);
  if (!target) {
    throw new UserError(USER_ERROR.USER_NOT_FOUND, 'El usuario no existe');
  }

  const patch = {};
  if ('role' in changes) {
    if (changes.role !== null && !isRole(changes.role)) {
      throw new UserError(USER_ERROR.INVALID_ROLE, 'El rol no es válido');
    }
    patch.role = changes.role;
  }
  if ('active' in changes) {
    if (typeof changes.active !== 'boolean') {
      throw new UserError(USER_ERROR.INVALID_ROLE, 'El estado de la cuenta no es válido');
    }
    patch.active = changes.active;
  }

  const updated = { ...target, ...patch };
  const before = users.some(isActiveAdmin);
  const after = users.map((user) => (user.id === targetId ? updated : user)).some(isActiveAdmin);
  if (before && !after) {
    throw new UserError(USER_ERROR.LAST_ADMIN, 'Debe quedar al menos un administrador activo');
  }
  return updated;
}
