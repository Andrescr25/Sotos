import { ORDER_STATUS } from '@/domain/orders/orderStatus';
import { PAYMENT_METHODS } from '@/domain/payments';

/**
 * @typedef {Object} MethodTotals
 * @property {number} count  pedidos cobrados con esta forma de pago
 * @property {number} total  colones cobrados (el total de los pedidos, sin el vuelto)
 *
 * @typedef {Object} SalesSummary
 * @property {number} orderCount  pedidos cobrados, sin contar los cancelados
 * @property {number} total  colones cobrados, sin contar los cancelados
 * @property {Record<string, MethodTotals>} byMethod  siempre trae las tres formas de pago
 * @property {MethodTotals} cancelled  pedidos cobrados que luego se cancelaron (no suman a las ventas)
 * @property {string | null} firstSaleAt  primer cobro (ISO)
 * @property {string | null} lastSaleAt  último cobro (ISO)
 */

/**
 * ¿Pedido con un cobro registrado? Los pedidos guardados antes de existir el
 * pago no lo tienen y quedan fuera del cierre.
 * @param {import('@/domain/orders/order').Order} order
 * @returns {boolean}
 */
export function isPaidOrder(order) {
  return Boolean(order?.payment) && typeof order.payment === 'object';
}

/**
 * Totales de ventas de un grupo de pedidos cobrados. Un pedido cancelado
 * después de cobrarse no cuenta como venta: se informa aparte, porque el
 * cajero debe haber devuelto ese dinero.
 * @param {import('@/domain/orders/order').Order[]} orders
 * @returns {SalesSummary}
 */
export function summarizeSales(orders) {
  const byMethod = Object.fromEntries(PAYMENT_METHODS.map((method) => [method, { count: 0, total: 0 }]));
  const cancelled = { count: 0, total: 0 };
  let orderCount = 0;
  let total = 0;
  let firstSaleAt = null;
  let lastSaleAt = null;

  for (const order of orders.filter(isPaidOrder)) {
    const { method, amount, paidAt } = order.payment;
    if (order.status === ORDER_STATUS.CANCELLED) {
      cancelled.count += 1;
      cancelled.total += amount;
      continue;
    }
    orderCount += 1;
    total += amount;
    if (byMethod[method]) {
      byMethod[method].count += 1;
      byMethod[method].total += amount;
    }
    if (!firstSaleAt || paidAt < firstSaleAt) firstSaleAt = paidAt;
    if (!lastSaleAt || paidAt > lastSaleAt) lastSaleAt = paidAt;
  }

  return { orderCount, total, byMethod, cancelled, firstSaleAt, lastSaleAt };
}
