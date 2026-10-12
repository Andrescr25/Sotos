import { MENU_ERROR, MenuError } from './menuErrors';
import { PRODUCT_KIND } from './productKind';

export const NAME_MAX_LENGTH = 60;
export const NOTE_MAX_LENGTH = 40;
/** Precio máximo en colones (evita errores de digitación como un cero de más repetido). */
export const PRICE_MAX = 9_999_999;

/**
 * Iconos que se pueden asignar a una categoría (nombres de Ionicons). La
 * interfaz los dibuja a través de shared/ui/Icon.
 */
export const MENU_ICONS = Object.freeze([
  'fast-food',
  'restaurant',
  'pizza',
  'fish',
  'egg',
  'leaf',
  'nutrition',
  'ice-cream',
  'cafe',
  'beer',
  'wine',
  'water',
  'flame',
  'star',
  'gift',
]);

/** Texto limpio: sin espacios sobrantes ni espacios dobles. */
const squash = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');

/** Clave para comparar nombres sin distinguir mayúsculas. */
export const nameKey = (value) => squash(value).toLocaleLowerCase('es');

/**
 * @param {unknown} value
 * @returns {string}
 */
export function cleanName(value) {
  const name = squash(value);
  if (name.length < 1 || name.length > NAME_MAX_LENGTH) {
    throw new MenuError(
      MENU_ERROR.INVALID_NAME,
      `El nombre debe tener entre 1 y ${NAME_MAX_LENGTH} caracteres`,
    );
  }
  return name;
}

/**
 * Precio en colones: entero, sin decimales.
 * @param {unknown} value
 * @returns {number}
 */
export function validatePrice(value) {
  if (!Number.isInteger(value) || value < 0 || value > PRICE_MAX) {
    throw new MenuError(
      MENU_ERROR.INVALID_PRICE,
      `El precio debe ser un número entero de colones entre 0 y ${PRICE_MAX}`,
    );
  }
  return value;
}

/** @param {unknown} value */
export function validateKind(value) {
  if (value !== PRODUCT_KIND.DISH && value !== PRODUCT_KIND.DRINK) {
    throw new MenuError(MENU_ERROR.INVALID_KIND, 'El tipo debe ser plato o bebida');
  }
  return value;
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
export function validateIcon(value) {
  if (value === null || value === undefined || value === '') return null;
  if (!MENU_ICONS.includes(value)) {
    throw new MenuError(MENU_ERROR.INVALID_ICON, 'El icono no es válido');
  }
  return value;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function cleanNote(value) {
  const note = squash(value);
  if (note.length < 1 || note.length > NOTE_MAX_LENGTH) {
    throw new MenuError(
      MENU_ERROR.INVALID_NOTE,
      `La observación debe tener entre 1 y ${NOTE_MAX_LENGTH} caracteres`,
    );
  }
  return note;
}
