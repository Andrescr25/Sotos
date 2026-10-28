import { AppError } from '@/shared/errors/AppError';

export const PAYMENT_ERROR = Object.freeze({
  INVALID_METHOD: 'payment_invalid_method',
  /** El monto recibido no es un número entero de colones. */
  INVALID_AMOUNT: 'payment_invalid_amount',
  /** En efectivo, el cliente entregó menos que el total. */
  INSUFFICIENT: 'payment_insufficient',
});

/**
 * Error de regla de negocio de pagos. La UI decide qué mensaje mostrar según `code`.
 */
export class PaymentError extends AppError {
  /**
   * @param {string} code uno de PAYMENT_ERROR
   * @param {string} message
   */
  constructor(code, message) {
    super(code, message);
    this.name = 'PaymentError';
  }
}
