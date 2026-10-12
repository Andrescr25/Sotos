import { PERMISSIONS } from '@/domain/users/permissions';

/**
 * Ciclo de vida del pedido:
 *
 *   DRAFT -> NEW -> IN_PROGRESS -> READY -> DELIVERED
 *      \______\__________\___________\____-> CANCELLED
 *
 * DRAFT es el pedido que el cajero todavía arma; cocina no lo ve.
 * "Nuevo" significa "ya enviado a cocina".
 */
export const ORDER_STATUS = Object.freeze({
  DRAFT: 'draft',
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  READY: 'ready',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
});

export const ORDER_STATUS_LABELS = Object.freeze({
  [ORDER_STATUS.DRAFT]: 'Borrador',
  [ORDER_STATUS.NEW]: 'Nuevo',
  [ORDER_STATUS.IN_PROGRESS]: 'En preparación',
  [ORDER_STATUS.READY]: 'Listo',
  [ORDER_STATUS.DELIVERED]: 'Entregado',
  [ORDER_STATUS.CANCELLED]: 'Cancelado',
});

/** Estados en los que el pedido aparece en la pantalla de cocina. */
export const KITCHEN_STATUSES = Object.freeze([
  ORDER_STATUS.NEW,
  ORDER_STATUS.IN_PROGRESS,
  ORDER_STATUS.READY,
]);

/** Estados terminales: ya no admiten cambios. */
export const FINAL_STATUSES = Object.freeze([
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.CANCELLED,
]);

/**
 * Transiciones permitidas: desde -> hacia -> permiso requerido.
 * Es la única fuente de verdad del flujo de estados.
 */
const TRANSITIONS = Object.freeze({
  [ORDER_STATUS.DRAFT]: {
    [ORDER_STATUS.NEW]: PERMISSIONS.ORDER_SEND,
    [ORDER_STATUS.CANCELLED]: PERMISSIONS.ORDER_CANCEL,
  },
  [ORDER_STATUS.NEW]: {
    [ORDER_STATUS.IN_PROGRESS]: PERMISSIONS.ORDER_START,
    [ORDER_STATUS.CANCELLED]: PERMISSIONS.ORDER_CANCEL,
  },
  [ORDER_STATUS.IN_PROGRESS]: {
    [ORDER_STATUS.READY]: PERMISSIONS.ORDER_MARK_READY,
    [ORDER_STATUS.CANCELLED]: PERMISSIONS.ORDER_CANCEL,
  },
  [ORDER_STATUS.READY]: {
    [ORDER_STATUS.DELIVERED]: PERMISSIONS.ORDER_DELIVER,
    [ORDER_STATUS.CANCELLED]: PERMISSIONS.ORDER_CANCEL,
  },
  [ORDER_STATUS.DELIVERED]: {},
  [ORDER_STATUS.CANCELLED]: {},
});

/**
 * Permiso necesario para pasar de `from` a `to`, o null si la transición no existe.
 * @param {string} from
 * @param {string} to
 * @returns {string | null}
 */
export function getTransitionPermission(from, to) {
  return TRANSITIONS[from]?.[to] ?? null;
}

/**
 * Estados a los que se puede pasar desde `status`.
 * @param {string} status
 * @returns {string[]}
 */
export function getNextStatuses(status) {
  return Object.keys(TRANSITIONS[status] ?? {});
}
