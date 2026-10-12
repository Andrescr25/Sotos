import { PERMISSIONS, can } from './permissions';
import { ROLES } from './roles';

/** Zonas de trabajo de la app. Cada una exige un permiso. */
export const AREAS = Object.freeze({
  CASHIER: 'cashier',
  KITCHEN: 'kitchen',
  ADMIN: 'admin',
});

const AREA_PERMISSION = Object.freeze({
  [AREAS.CASHIER]: PERMISSIONS.ORDER_CREATE,
  [AREAS.KITCHEN]: PERMISSIONS.KITCHEN_VIEW,
  [AREAS.ADMIN]: PERMISSIONS.USER_MANAGE,
});

/**
 * ¿Tiene la cuenta algún acceso? Falso si está deshabilitada o si el
 * administrador todavía no le asignó un rol.
 * @param {import('./roles').User | null | undefined} user
 * @returns {boolean}
 */
export function hasAccess(user) {
  return Boolean(user && user.active && user.role);
}

/**
 * @param {import('./roles').User | null | undefined} user
 * @param {string} area uno de AREAS
 * @returns {boolean}
 */
export function canAccessArea(user, area) {
  return hasAccess(user) && can(user.role, AREA_PERMISSION[area]);
}

/**
 * Zona a la que se lleva al usuario justo después de iniciar sesión.
 * @param {import('./roles').User | null | undefined} user
 * @returns {string | null} una de AREAS, o null si no tiene acceso
 */
export function getHomeArea(user) {
  if (!hasAccess(user)) return null;
  if (user.role === ROLES.ADMIN) return AREAS.ADMIN;
  if (user.role === ROLES.COOK) return AREAS.KITCHEN;
  return AREAS.CASHIER;
}
