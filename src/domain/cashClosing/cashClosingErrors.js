import { AppError } from '@/shared/errors/AppError';

export const CASH_CLOSING_ERROR = Object.freeze({
  /** No hay pedidos cobrados desde el último cierre. */
  NO_SALES: 'cash_no_sales',
  /** El fondo inicial o el efectivo contado no son colones enteros. */
  INVALID_AMOUNT: 'cash_invalid_amount',
  INVALID_NOTE: 'cash_invalid_note',
  INVALID_ID: 'cash_invalid_id',
});

/**
 * Error de regla de negocio del cierre de caja. La UI decide qué mensaje
 * mostrar según `code`.
 */
export class CashClosingError extends AppError {
  /**
   * @param {string} code uno de CASH_CLOSING_ERROR
   * @param {string} message
   */
  constructor(code, message) {
    super(code, message);
    this.name = 'CashClosingError';
  }
}
