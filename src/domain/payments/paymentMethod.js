/** Formas de pago que acepta el restaurante. */
export const PAYMENT_METHOD = Object.freeze({
  CASH: 'cash',
  CARD: 'card',
  SINPE: 'sinpe',
});

/** En el orden en que se ofrecen en Caja. */
export const PAYMENT_METHODS = Object.freeze([
  PAYMENT_METHOD.CASH,
  PAYMENT_METHOD.CARD,
  PAYMENT_METHOD.SINPE,
]);

export const PAYMENT_METHOD_LABELS = Object.freeze({
  [PAYMENT_METHOD.CASH]: 'Efectivo',
  [PAYMENT_METHOD.CARD]: 'Tarjeta',
  [PAYMENT_METHOD.SINPE]: 'SINPE Móvil',
});

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isPaymentMethod(value) {
  return PAYMENT_METHODS.includes(value);
}
