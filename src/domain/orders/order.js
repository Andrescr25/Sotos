import { createId } from '@/shared/utils/createId';
import { can } from '@/domain/users/permissions';
import { ORDER_ERROR, OrderError } from './orderErrors';
import { getItemKey, mergeItems, withNotes, withQuantity } from './orderItem';
import { calculateOrderTotals } from './pricing';
import { KITCHEN_STATUSES, ORDER_STATUS, getTransitionPermission } from './orderStatus';
import { ORDER_TYPE } from './orderType';

/**
 * Todas las funciones de este archivo son puras e inmutables: reciben un
 * pedido y devuelven uno nuevo. El tiempo (`now`) se inyecta para poder probarlas.
 *
 * @typedef {Object} Actor  quién hizo algo (copia mínima del usuario)
 * @property {string} id
 * @property {string} name
 *
 * @typedef {Object} StatusChange
 * @property {string} status
 * @property {string} at  fecha ISO
 * @property {Actor} by
 *
 * @typedef {Object} Order
 * @property {string} id
 * @property {number | null} number  consecutivo del día; se asigna al enviar a cocina
 * @property {string} type  ver ORDER_TYPE
 * @property {string | null} tableId  reservado para el módulo de mesas
 * @property {string} status  ver ORDER_STATUS
 * @property {import('./orderItem').OrderItem[]} items
 * @property {string} note  observación general del pedido
 * @property {Actor} createdBy  quién tomó el pedido
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {StatusChange[]} statusHistory
 * @property {import('./pricing').OrderTotals} totals
 */

const toActor = (user) => ({ id: user.id, name: user.name });

function assertEditable(order) {
  if (order.status !== ORDER_STATUS.DRAFT) {
    throw new OrderError(
      ORDER_ERROR.NOT_EDITABLE,
      'Solo se puede modificar un pedido que aún no se envió a cocina',
    );
  }
}

function withItems(order, items, now) {
  return {
    ...order,
    items,
    totals: calculateOrderTotals(items),
    updatedAt: now.toISOString(),
  };
}

function findItem(order, itemId) {
  const item = order.items.find((candidate) => candidate.id === itemId);
  if (!item) {
    throw new OrderError(ORDER_ERROR.ITEM_NOT_FOUND, 'La línea del pedido no existe');
  }
  return item;
}

/**
 * Crea un pedido nuevo en borrador.
 * @param {Object} params
 * @param {import('@/domain/users/roles').User} params.createdBy
 * @param {string} [params.type]
 * @param {string | null} [params.tableId]
 * @param {Date} [params.now]
 * @returns {Order}
 */
export function createDraftOrder({
  createdBy,
  type = ORDER_TYPE.DINE_IN,
  tableId = null,
  now = new Date(),
}) {
  const actor = toActor(createdBy);
  const at = now.toISOString();
  return {
    id: createId('ord'),
    number: null,
    type,
    tableId,
    status: ORDER_STATUS.DRAFT,
    items: [],
    note: '',
    createdBy: actor,
    createdAt: at,
    updatedAt: at,
    statusHistory: [{ status: ORDER_STATUS.DRAFT, at, by: actor }],
    totals: calculateOrderTotals([]),
  };
}

/**
 * Agrega una línea. Si ya existe una idéntica (mismo producto, extras y
 * observaciones) se suman las cantidades en lugar de duplicar la línea.
 * @param {Order} order
 * @param {import('./orderItem').OrderItem} item
 * @param {Date} [now]
 * @returns {Order}
 */
export function addItem(order, item, now = new Date()) {
  assertEditable(order);
  const key = getItemKey(item);
  const existing = order.items.find((candidate) => getItemKey(candidate) === key);
  const items = existing
    ? order.items.map((candidate) =>
        candidate.id === existing.id ? mergeItems(candidate, item) : candidate,
      )
    : [...order.items, item];
  return withItems(order, items, now);
}

/**
 * Cambia la cantidad de una línea. Cantidad 0 la elimina.
 * @param {Order} order
 * @param {string} itemId
 * @param {number} quantity entero >= 0
 * @param {Date} [now]
 * @returns {Order}
 */
export function setItemQuantity(order, itemId, quantity, now = new Date()) {
  assertEditable(order);
  const item = findItem(order, itemId);
  if (quantity === 0) return removeItem(order, itemId, now);
  const updated = withQuantity(item, quantity);
  return withItems(
    order,
    order.items.map((candidate) => (candidate.id === itemId ? updated : candidate)),
    now,
  );
}

/**
 * Reemplaza las observaciones de una línea.
 * @param {Order} order
 * @param {string} itemId
 * @param {string[]} notes
 * @param {Date} [now]
 * @returns {Order}
 */
export function setItemNotes(order, itemId, notes, now = new Date()) {
  assertEditable(order);
  const item = findItem(order, itemId);
  const updated = withNotes(item, notes);
  return withItems(
    order,
    order.items.map((candidate) => (candidate.id === itemId ? updated : candidate)),
    now,
  );
}

/**
 * @param {Order} order
 * @param {string} itemId
 * @param {Date} [now]
 * @returns {Order}
 */
export function removeItem(order, itemId, now = new Date()) {
  assertEditable(order);
  findItem(order, itemId);
  return withItems(
    order,
    order.items.filter((candidate) => candidate.id !== itemId),
    now,
  );
}

/**
 * Observación general del pedido.
 * @param {Order} order
 * @param {string} note
 * @param {Date} [now]
 * @returns {Order}
 */
export function setOrderNote(order, note, now = new Date()) {
  assertEditable(order);
  return { ...order, note: String(note).trim(), updatedAt: now.toISOString() };
}

/**
 * Mueve el pedido a otro estado validando el flujo y el permiso del usuario.
 * @param {Order} order
 * @param {string} nextStatus
 * @param {Object} params
 * @param {import('@/domain/users/roles').User} params.user
 * @param {Date} [params.now]
 * @returns {Order}
 */
export function changeOrderStatus(order, nextStatus, { user, now = new Date() }) {
  const permission = getTransitionPermission(order.status, nextStatus);
  if (!permission) {
    throw new OrderError(
      ORDER_ERROR.INVALID_TRANSITION,
      `No se puede pasar un pedido de "${order.status}" a "${nextStatus}"`,
    );
  }
  if (!user || !can(user.role, permission)) {
    throw new OrderError(
      ORDER_ERROR.FORBIDDEN,
      'Este usuario no tiene permiso para realizar esta acción',
    );
  }
  if (order.status === ORDER_STATUS.DRAFT && nextStatus === ORDER_STATUS.NEW && order.items.length === 0) {
    throw new OrderError(ORDER_ERROR.EMPTY_ORDER, 'El pedido no tiene productos');
  }

  const at = now.toISOString();
  return {
    ...order,
    status: nextStatus,
    updatedAt: at,
    statusHistory: [...order.statusHistory, { status: nextStatus, at, by: toActor(user) }],
  };
}

/**
 * Envía el pedido a cocina: DRAFT -> NEW y asigna el número consecutivo.
 * @param {Order} order
 * @param {Object} params
 * @param {number} params.number consecutivo asignado por el repositorio
 * @param {import('@/domain/users/roles').User} params.user
 * @param {Date} [params.now]
 * @returns {Order}
 */
export function sendOrderToKitchen(order, { number, user, now = new Date() }) {
  if (!Number.isInteger(number) || number < 1) {
    throw new OrderError(ORDER_ERROR.INVALID_NUMBER, 'El número de pedido no es válido');
  }
  const sent = changeOrderStatus(order, ORDER_STATUS.NEW, { user, now });
  return { ...sent, number };
}

/**
 * Momento (ISO) en que el pedido entró a un estado, o null si nunca lo hizo.
 * @param {Order} order
 * @param {string} status
 * @returns {string | null}
 */
export function getStatusTime(order, status) {
  const change = [...order.statusHistory].reverse().find((entry) => entry.status === status);
  return change ? change.at : null;
}

/**
 * Milisegundos desde que el pedido llegó a cocina; null si aún no se envió.
 * @param {Order} order
 * @param {Date} [now]
 * @returns {number | null}
 */
export function getElapsedSinceSent(order, now = new Date()) {
  const sentAt = getStatusTime(order, ORDER_STATUS.NEW);
  return sentAt ? now.getTime() - new Date(sentAt).getTime() : null;
}

/**
 * @param {Order} order
 * @returns {boolean}
 */
export function isVisibleInKitchen(order) {
  return KITCHEN_STATUSES.includes(order.status);
}
