export const ORDER_ERROR = Object.freeze({
  INVALID_QUANTITY: 'invalid_quantity',
  INVALID_NUMBER: 'invalid_number',
  EMPTY_ORDER: 'empty_order',
  NOT_EDITABLE: 'not_editable',
  ORDER_NOT_FOUND: 'order_not_found',
  ITEM_NOT_FOUND: 'item_not_found',
  PRODUCT_UNAVAILABLE: 'product_unavailable',
  EXTRA_NOT_ALLOWED: 'extra_not_allowed',
  EXTRA_QUANTITY_EXCEEDED: 'extra_quantity_exceeded',
  INVALID_TRANSITION: 'invalid_transition',
  INVALID_ORDER: 'invalid_order',
  CONFLICT: 'conflict',
  FORBIDDEN: 'forbidden',
  /** El servidor rechazó la clave de API. */
  UNAUTHORIZED: 'unauthorized',
  /** No se pudo contactar al servidor (sin WiFi, servidor caído...). */
  NETWORK: 'network',
});

/**
 * Error de regla de negocio. La UI decide qué mensaje mostrar según `code`.
 */
export class OrderError extends Error {
  /**
   * @param {string} code uno de ORDER_ERROR
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = 'OrderError';
    this.code = code;
  }
}
