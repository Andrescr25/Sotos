import { AppError, COMMON_ERROR } from '@/shared/errors/AppError';

export const INVENTORY_ERROR = Object.freeze({
  INVALID_NAME: 'inventory_invalid_name',
  INVALID_UNIT: 'inventory_invalid_unit',
  /** Las porciones que rinde una unidad deben ser un entero ≥ 1. */
  INVALID_PORTIONS: 'inventory_invalid_portions',
  /** El stock, el mínimo o un ajuste no son números enteros válidos. */
  INVALID_AMOUNT: 'inventory_invalid_amount',
  INVALID_ADJUSTMENT: 'inventory_invalid_adjustment',
  INVALID_RECIPE: 'inventory_invalid_recipe',
  DUPLICATE_NAME: 'inventory_duplicate_name',
  ITEM_NOT_FOUND: 'inventory_item_not_found',
  FORBIDDEN: COMMON_ERROR.FORBIDDEN,
  UNAUTHORIZED: COMMON_ERROR.UNAUTHORIZED,
  NETWORK: COMMON_ERROR.NETWORK,
});

/** Error de regla de negocio del inventario. La interfaz decide el mensaje según `code`. */
export class InventoryError extends AppError {
  /**
   * @param {string} code uno de INVENTORY_ERROR
   * @param {string} message
   */
  constructor(code, message) {
    super(code, message);
    this.name = 'InventoryError';
  }
}
