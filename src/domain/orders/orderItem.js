import { createId } from '@/shared/utils/createId';
import { ORDER_ERROR, OrderError } from './orderErrors';

/**
 * Una línea del pedido. Guarda una copia (snapshot) del nombre y precio del
 * producto: cambiar el menú después no altera pedidos ya tomados.
 *
 * `extras[].quantity` es independiente de la cantidad de la línea:
 * "2 × Hamburguesa con 1 queso extra" = quantity 2, extra quantity 1.
 *
 * @typedef {Object} OrderItemExtra
 * @property {string} extraId
 * @property {string} name
 * @property {number} unitPrice
 * @property {number} quantity
 *
 * @typedef {Object} OrderItem
 * @property {string} id
 * @property {string} productId
 * @property {string} name
 * @property {'dish' | 'drink'} kind
 * @property {number} unitPrice
 * @property {number} quantity
 * @property {OrderItemExtra[]} extras
 * @property {string[]} notes  observaciones de la línea ("sin cebolla")
 */

function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) {
    throw new OrderError(
      ORDER_ERROR.INVALID_QUANTITY,
      `${label} debe ser un entero mayor o igual a 1`,
    );
  }
}

/**
 * Limpia observaciones: sin espacios sobrantes, sin vacías ni repetidas.
 * @param {string[]} notes
 * @returns {string[]}
 */
export function normalizeNotes(notes = []) {
  const cleaned = notes.map((note) => String(note).trim()).filter(Boolean);
  return [...new Set(cleaned)];
}

/**
 * @param {Object} params
 * @param {import('@/domain/menu/types').Product} params.product
 * @param {number} [params.quantity]
 * @param {{ extra: import('@/domain/menu/types').Extra, quantity?: number }[]} [params.extras]
 * @param {string[]} [params.notes]
 * @returns {OrderItem}
 */
export function createOrderItem({ product, quantity = 1, extras = [], notes = [] }) {
  if (!product.active) {
    throw new OrderError(
      ORDER_ERROR.PRODUCT_UNAVAILABLE,
      `"${product.name}" no está disponible`,
    );
  }
  assertPositiveInteger(quantity, 'La cantidad');

  const extrasById = new Map();
  extras.forEach(({ extra, quantity: extraQuantity = 1 }) => {
    if (!product.extraIds.includes(extra.id)) {
      throw new OrderError(
        ORDER_ERROR.EXTRA_NOT_ALLOWED,
        `"${extra.name}" no se puede agregar a "${product.name}"`,
      );
    }
    assertPositiveInteger(extraQuantity, 'La cantidad del extra');
    const previous = extrasById.get(extra.id);
    extrasById.set(extra.id, {
      extraId: extra.id,
      name: extra.name,
      unitPrice: extra.price,
      quantity: (previous?.quantity ?? 0) + extraQuantity,
    });
  });

  const itemExtras = [...extrasById.values()];
  itemExtras.forEach((extra) => {
    if (extra.quantity > quantity) {
      throw new OrderError(
        ORDER_ERROR.EXTRA_QUANTITY_EXCEEDED,
        `No puede haber más "${extra.name}" (${extra.quantity}) que unidades de "${product.name}" (${quantity})`,
      );
    }
  });

  return {
    id: createId('item'),
    productId: product.id,
    name: product.name,
    kind: product.kind,
    unitPrice: product.price,
    quantity,
    extras: itemExtras,
    notes: normalizeNotes(notes),
  };
}

/**
 * Clave que identifica "la misma línea": mismo producto, extras y observaciones.
 * Sirve para fusionar líneas idénticas en vez de duplicarlas.
 * @param {OrderItem} item
 * @returns {string}
 */
export function getItemKey(item) {
  const extras = item.extras
    .map((extra) => `${extra.extraId}x${extra.quantity}`)
    .sort()
    .join(',');
  const notes = [...item.notes].map((note) => note.toLowerCase()).sort().join('|');
  return `${item.productId}#${extras}#${notes}`;
}

/**
 * Suma cantidades de dos líneas con la misma clave.
 * @param {OrderItem} target
 * @param {OrderItem} incoming
 * @returns {OrderItem}
 */
export function mergeItems(target, incoming) {
  const extras = target.extras.map((extra) => {
    const match = incoming.extras.find((other) => other.extraId === extra.extraId);
    return match ? { ...extra, quantity: extra.quantity + match.quantity } : extra;
  });
  return { ...target, quantity: target.quantity + incoming.quantity, extras };
}

/**
 * Cambia la cantidad; los extras nunca quedan por encima de la nueva cantidad.
 * @param {OrderItem} item
 * @param {number} quantity entero >= 1
 * @returns {OrderItem}
 */
export function withQuantity(item, quantity) {
  assertPositiveInteger(quantity, 'La cantidad');
  return {
    ...item,
    quantity,
    extras: item.extras.map((extra) => ({
      ...extra,
      quantity: Math.min(extra.quantity, quantity),
    })),
  };
}

/**
 * @param {OrderItem} item
 * @param {string[]} notes
 * @returns {OrderItem}
 */
export function withNotes(item, notes) {
  return { ...item, notes: normalizeNotes(notes) };
}
