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
 * @param {unknown} value
 * @returns {string}
 */
function cleanAccountName(value) {
  const name = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 60) {
    throw new UserError(USER_ERROR.INVALID_NAME, 'El nombre debe tener entre 2 y 60 caracteres');
  }
  return name;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function cleanUsername(value) {
  const username = normalizeUsername(value);
  if (!USERNAME_PATTERN.test(username)) {
    throw new UserError(
      USER_ERROR.INVALID_USERNAME,
      'El usuario debe tener entre 3 y 30 caracteres: letras, números, punto, guion o guion bajo',
    );
  }
  return username;
}

/**
 * Valida una contraseña nueva. Lanza UserError si no cumple.
 * @param {unknown} value
 * @returns {string}
 */
export function validatePassword(value) {
  const password = String(value ?? '');
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    throw new UserError(
      USER_ERROR.INVALID_PASSWORD,
      `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
    );
  }
  return password;
}

/**
 * Datos con los que el administrador crea la cuenta de un empleado. No lleva
 * contraseña: la crea el empleado con el enlace de invitación.
 * El rol puede quedar sin asignar (`null`) y asignarse después.
 *
 * @param {{ name?: unknown, username?: unknown, role?: unknown }} input
 * @returns {{ name: string, username: string, role: string | null }}
 */
export function validateNewAccount(input) {
  const role = input?.role === undefined || input?.role === '' ? null : input.role;
  if (role !== null && !isRole(role)) {
    throw new UserError(USER_ERROR.INVALID_ROLE, 'El rol no es válido');
  }
  return {
    name: cleanAccountName(input?.name),
    username: cleanUsername(input?.username),
    role,
  };
}

/**
 * Propone un usuario a partir del nombre: "María Pérez" -> "maria.perez".
 * Es solo una sugerencia: quien administra puede cambiarlo.
 * @param {string} name
 * @returns {string}
 */
export function suggestUsername(name) {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 30);
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
