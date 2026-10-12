/**
 * Cálculo de montos. Todo en colones enteros, sin decimales.
 *
 * Hoy el total es la suma de las líneas. Descuentos, impuestos (IVA) y
 * propinas se agregarán en este archivo cuando exista el módulo de pagos
 * y facturación; `totals` ya separa subtotal de total para eso.
 */

/**
 * Total de una línea: precio × cantidad + sus extras.
 * @param {import('./orderItem').OrderItem} item
 * @returns {number}
 */
export function calculateItemTotal(item) {
  const extrasTotal = item.extras.reduce(
    (sum, extra) => sum + extra.unitPrice * extra.quantity,
    0,
  );
  return item.unitPrice * item.quantity + extrasTotal;
}

/**
 * @typedef {Object} OrderTotals
 * @property {number} subtotal
 * @property {number} total
 * @property {number} itemCount  unidades totales (suma de cantidades)
 */

/**
 * @param {import('./orderItem').OrderItem[]} items
 * @returns {OrderTotals}
 */
export function calculateOrderTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return { subtotal, total: subtotal, itemCount };
}
