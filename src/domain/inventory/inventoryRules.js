import { INVENTORY_ERROR, InventoryError } from './inventoryErrors';

export const NAME_MAX_LENGTH = 60;
export const UNIT_MAX_LENGTH = 20;
/** Porciones máximas que puede rendir una unidad (evita errores de digitación). */
export const PORTIONS_PER_UNIT_MAX = 10_000;
/** Tope de porciones para el stock, un mínimo o un ajuste. */
export const AMOUNT_MAX = 1_000_000;

/** Texto limpio: sin espacios sobrantes ni espacios dobles. */
const squash = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');

/** @param {unknown} value */
export function cleanName(value) {
  const name = squash(value);
  if (name.length < 1 || name.length > NAME_MAX_LENGTH) {
    throw new InventoryError(
      INVENTORY_ERROR.INVALID_NAME,
      `El nombre debe tener entre 1 y ${NAME_MAX_LENGTH} caracteres`,
    );
  }
  return name;
}

/** @param {unknown} value */
export function cleanUnit(value) {
  const unit = squash(value);
  if (unit.length < 1 || unit.length > UNIT_MAX_LENGTH) {
    throw new InventoryError(
      INVENTORY_ERROR.INVALID_UNIT,
      `La unidad debe tener entre 1 y ${UNIT_MAX_LENGTH} caracteres (paquete, kg, botella…)`,
    );
  }
  return unit;
}

/** Porciones que rinde una unidad: entero entre 1 y el máximo. */
export function validatePortionsPerUnit(value) {
  if (!Number.isInteger(value) || value < 1 || value > PORTIONS_PER_UNIT_MAX) {
    throw new InventoryError(
      INVENTORY_ERROR.INVALID_PORTIONS,
      `Las porciones por unidad deben ser un entero entre 1 y ${PORTIONS_PER_UNIT_MAX}`,
    );
  }
  return value;
}

/**
 * Una cantidad de porciones (stock inicial, mínimo, conteo): entero ≥ 0.
 * @param {unknown} value
 */
export function validateAmount(value) {
  if (!Number.isInteger(value) || value < 0 || value > AMOUNT_MAX) {
    throw new InventoryError(
      INVENTORY_ERROR.INVALID_AMOUNT,
      `La cantidad debe ser un entero de porciones entre 0 y ${AMOUNT_MAX}`,
    );
  }
  return value;
}

/** Clave para comparar nombres sin distinguir mayúsculas. */
export const nameKey = (value) => squash(value).toLocaleLowerCase('es');
