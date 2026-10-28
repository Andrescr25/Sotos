import { PAYMENT_ERROR, PaymentError } from './paymentErrors';
import { PAYMENT_METHOD, isPaymentMethod } from './paymentMethod';

/**
 * Todo en colones enteros. Funciones puras: el tiempo (`now`) se inyecta.
 *
 * @typedef {Object} Payment  cobro confirmado de un pedido (se guarda con el pedido)
 * @property {string} method  ver PAYMENT_METHOD
 * @property {number} amount  lo que se cobró: siempre el total del pedido
 * @property {number} tendered  lo que entregó el cliente (en tarjeta y SINPE, igual a `amount`)
 * @property {number} change  vuelto que se devolvió: `tendered - amount` (0 fuera de efectivo)
 * @property {string} paidAt  fecha ISO en que se confirmó el pago
 * @property {{ id: string, name: string }} receivedBy  quién recibió el pago
 */

/** Billetes de colones usados para sugerir "con cuánto paga" (de menor a mayor). */
const CASH_ROUNDING_STEPS = Object.freeze([1_000, 5_000, 10_000, 20_000, 50_000]);
const SUGGESTION_COUNT = 4;

/**
 * Vuelto que corresponde. Negativo si lo entregado no alcanza.
 * @param {number} total
 * @param {number} tendered
 * @returns {number}
 */
export function calculateChange(total, tendered) {
  return tendered - total;
}

/**
 * Montos redondos para ofrecer como "paga con", por encima del total y sin
 * repetir (el pago exacto se ofrece aparte). Ej.: ₡8.500 → 9.000, 10.000, 20.000, 50.000.
 * @param {number} total
 * @returns {number[]}
 */
export function suggestTenderedAmounts(total) {
  const amounts = CASH_ROUNDING_STEPS.map((step) => Math.ceil(total / step) * step).filter(
    (amount) => amount > total,
  );
  return [...new Set(amounts)].sort((a, b) => a - b).slice(0, SUGGESTION_COUNT);
}

/**
 * Registra el cobro de un pedido.
 *
 * - Efectivo: `tendered` es lo que entregó el cliente y debe cubrir el total;
 *   el vuelto se calcula.
 * - Tarjeta y SINPE Móvil: se cobra el total exacto (se ignora `tendered`).
 *
 * @param {Object} params
 * @param {string} params.method
 * @param {number} params.total  total del pedido
 * @param {number} [params.tendered]  solo efectivo
 * @param {{ id: string, name: string }} params.receivedBy
 * @param {Date} [params.now]
 * @returns {Payment}
 */
export function createPayment({ method, total, tendered, receivedBy, now = new Date() }) {
  if (!isPaymentMethod(method)) {
    throw new PaymentError(PAYMENT_ERROR.INVALID_METHOD, 'La forma de pago no es válida');
  }
  if (!Number.isInteger(total) || total < 0) {
    throw new PaymentError(PAYMENT_ERROR.INVALID_AMOUNT, 'El total del pedido no es válido');
  }

  let received = total;
  if (method === PAYMENT_METHOD.CASH) {
    if (!Number.isInteger(tendered) || tendered < 0) {
      throw new PaymentError(
        PAYMENT_ERROR.INVALID_AMOUNT,
        'Indica con cuánto paga el cliente (colones enteros)',
      );
    }
    if (tendered < total) {
      throw new PaymentError(
        PAYMENT_ERROR.INSUFFICIENT,
        'El efectivo recibido no alcanza para cubrir el total',
      );
    }
    received = tendered;
  }

  return {
    method,
    amount: total,
    tendered: received,
    change: calculateChange(total, received),
    paidAt: now.toISOString(),
    receivedBy: { id: receivedBy.id, name: receivedBy.name },
  };
}

/**
 * ¿Es este cobro coherente con el total del pedido? Lo usan el dominio y el
 * servidor para no confiar en lo que envíe una tablet.
 * @param {unknown} payment
 * @param {number} total  total del pedido
 * @returns {boolean}
 */
export function isValidPayment(payment, total) {
  if (!payment || typeof payment !== 'object') return false;
  const { method, amount, tendered, change, paidAt, receivedBy } = payment;
  return (
    isPaymentMethod(method) &&
    Number.isInteger(total) &&
    amount === total &&
    Number.isInteger(tendered) &&
    tendered >= amount &&
    change === tendered - amount &&
    (method === PAYMENT_METHOD.CASH || tendered === amount) &&
    typeof paidAt === 'string' &&
    !Number.isNaN(Date.parse(paidAt)) &&
    typeof receivedBy?.id === 'string' &&
    receivedBy.id.length > 0
  );
}
