import { ROLES } from './roles';

/**
 * Acciones del sistema que se pueden permitir o negar. Los roles no se
 * consultan directamente en la lógica: se pregunta por el permiso con `can`.
 * Así, agregar un rol o mover una acción de rol es un cambio en este archivo.
 */
export const PERMISSIONS = Object.freeze({
  ORDER_VIEW: 'order:view',
  ORDER_CREATE: 'order:create',
  ORDER_SEND: 'order:send',
  ORDER_START: 'order:start',
  ORDER_MARK_READY: 'order:mark_ready',
  ORDER_DELIVER: 'order:deliver',
  ORDER_CANCEL: 'order:cancel',
  KITCHEN_VIEW: 'kitchen:view',
  /** Ver usuarios y asignarles rol / habilitarlos. */
  USER_MANAGE: 'user:manage',
});

const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.CASHIER]: [
    PERMISSIONS.ORDER_VIEW,
    PERMISSIONS.ORDER_CREATE,
    PERMISSIONS.ORDER_SEND,
    PERMISSIONS.ORDER_DELIVER,
    PERMISSIONS.ORDER_CANCEL,
  ],
  [ROLES.COOK]: [
    PERMISSIONS.ORDER_VIEW,
    PERMISSIONS.KITCHEN_VIEW,
    PERMISSIONS.ORDER_START,
    PERMISSIONS.ORDER_MARK_READY,
  ],
  // El administrador tiene acceso total: ver `can`.
  [ROLES.ADMIN]: [],
});

/**
 * @param {string | null | undefined} role  null/undefined = sin acceso asignado
 * @param {string} permission uno de PERMISSIONS
 * @returns {boolean}
 */
export function can(role, permission) {
  if (!role) return false;
  if (role === ROLES.ADMIN) return true;
  return (ROLE_PERMISSIONS[role] ?? []).includes(permission);
}
