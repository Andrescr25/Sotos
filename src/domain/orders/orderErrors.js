import { AppError, COMMON_ERROR } from '@/shared/errors/AppError';

export const ORDER_ERROR = Object.freeze({
  INVALID_QUANTITY: 'invalid_quantity',
  INVALID_NUMBER: 'invalid_number',
  EMPTY_ORDER: 'empty_order',
  /** La cuenta que sale de Caja debe llevar el nombre del cliente. */
  CUSTOMER_NAME_REQUIRED: 'customer_name_required',
  NOT_EDITABLE: 'not_editable',
  ORDER_NOT_FOUND: 'order_not_found',
  ITEM_NOT_FOUND: 'item_not_found',
  PRODUCT_UNAVAILABLE: 'product_unavailable',
  EXTRA_NOT_ALLOWED: 'extra_not_allowed',
  EXTRA_QUANTITY_EXCEEDED: 'extra_quantity_exceeded',
  INVALID_TRANSITION: 'invalid_transition',
  INVALID_ORDER: 'invalid_order',
  CONFLICT: 'conflict',
  FORBIDDEN: COMMON_ERROR.FORBIDDEN,
  UNAUTHORIZED: COMMON_ERROR.UNAUTHORIZED,
  NETWORK: COMMON_ERROR.NETWORK,
});

/**
 * Error de regla de negocio de pedidos. La UI decide qué mensaje mostrar según `code`.
 */
export class OrderError extends AppError {
  /**
   * @param {string} code uno de ORDER_ERROR
   * @param {string} message
   */
  constructor(code, message) {
    super(code, message);
    this.name = 'OrderError';
  }
}
