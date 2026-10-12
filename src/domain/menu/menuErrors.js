import { AppError, COMMON_ERROR } from '@/shared/errors/AppError';

export const MENU_ERROR = Object.freeze({
  INVALID_NAME: 'menu_invalid_name',
  INVALID_PRICE: 'menu_invalid_price',
  INVALID_KIND: 'menu_invalid_kind',
  INVALID_ICON: 'menu_invalid_icon',
  INVALID_NOTE: 'menu_invalid_note',
  INVALID_ACTIVE: 'menu_invalid_active',
  INVALID_COLLECTION: 'menu_invalid_collection',
  INVALID_DIRECTION: 'menu_invalid_direction',
  DUPLICATE_NAME: 'menu_duplicate_name',
  DUPLICATE_NOTE: 'menu_duplicate_note',
  CATEGORY_NOT_FOUND: 'category_not_found',
  PRODUCT_NOT_FOUND: 'product_not_found',
  EXTRA_NOT_FOUND: 'extra_not_found',
  NOTE_NOT_FOUND: 'note_not_found',
  /** No se puede eliminar una categoría que todavía tiene productos. */
  CATEGORY_NOT_EMPTY: 'category_not_empty',
  /** El menú de ejemplo solo se puede cargar cuando el menú está vacío. */
  MENU_NOT_EMPTY: 'menu_not_empty',
  FORBIDDEN: COMMON_ERROR.FORBIDDEN,
  UNAUTHORIZED: COMMON_ERROR.UNAUTHORIZED,
  NETWORK: COMMON_ERROR.NETWORK,
});

/** Error de regla de negocio del menú. La interfaz decide el mensaje según `code`. */
export class MenuError extends AppError {
  /**
   * @param {string} code uno de MENU_ERROR
   * @param {string} message
   */
  constructor(code, message) {
    super(code, message);
    this.name = 'MenuError';
  }
}
