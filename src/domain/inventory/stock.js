/**
 * Cómo se lee el stock y las porciones. Funciones puras, sin React.
 *
 * @typedef {Pick<import('./inventoryAdmin').InventoryItem, 'unit' | 'portionsPerUnit'>} UnitInfo
 */

export const STOCK_STATUS = Object.freeze({
  OK: 'ok',
  /** Quedan menos del mínimo que definió el administrador. */
  LOW: 'low',
  /** No queda nada (o se vendió más de lo registrado). */
  OUT: 'out',
});

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

/**
 * Plural simple de una unidad escrita por el administrador. Solo toca palabras
 * sueltas: "paquete" → "paquetes", "unidad" → "unidades", "galón" → "galones";
 * las abreviaturas (kg, lb, ml) y las frases quedan como están.
 *
 * @param {string} unit
 * @param {number} count
 * @returns {string}
 */
export function pluralizeUnit(unit, count) {
  if (Math.abs(count) === 1) return unit;
  const word = unit.trim();
  if (!/^\p{L}+$/u.test(word)) return unit;
  const lower = word.toLowerCase();
  if (word.length <= 3 && !/[aeiouáéíóú]$/.test(lower)) return unit; // kg, lb, ml, oz
  if (/[aeiouáéíóú]$/.test(lower)) return `${word}s`;
  if (/z$/.test(lower)) return `${word.slice(0, -1)}ces`;
  const accented = { 'ón': 'ones', 'án': 'anes', 'én': 'enes', 'ín': 'ines', 'ún': 'unes' };
  const ending = lower.slice(-2);
  if (accented[ending]) return `${word.slice(0, -2)}${accented[ending]}`;
  return `${word}es`;
}

/**
 * Parte unas porciones en unidades completas y porciones sueltas.
 * @param {number} portions  ≥ 0
 * @param {number} portionsPerUnit
 * @returns {{ units: number, remainder: number }}
 */
export function splitPortions(portions, portionsPerUnit) {
  return { units: Math.floor(portions / portionsPerUnit), remainder: portions % portionsPerUnit };
}

/**
 * Unidades completas + porciones sueltas → porciones.
 * @param {{ units?: number, portions?: number }} amount
 * @param {number} portionsPerUnit
 */
export function toPortions({ units = 0, portions = 0 }, portionsPerUnit) {
  return units * portionsPerUnit + portions;
}

/**
 * Porciones en lenguaje de cocina: "1/8 de paquete", "3 paquetes", "2 y 3/8 paquetes".
 * @param {number} portions  ≥ 0
 * @param {UnitInfo} item
 * @returns {string}
 */
export function formatPortions(portions, item) {
  const { units, remainder } = splitPortions(portions, item.portionsPerUnit);
  if (remainder === 0) return `${units} ${pluralizeUnit(item.unit, units)}`;

  const divisor = gcd(remainder, item.portionsPerUnit);
  const fraction = `${remainder / divisor}/${item.portionsPerUnit / divisor}`;
  if (units === 0) return `${fraction} de ${item.unit}`;
  return `${units} y ${fraction} ${pluralizeUnit(item.unit, units + 1)}`;
}

/**
 * @param {Pick<import('./inventoryAdmin').InventoryItem, 'stock' | 'minPortions'>} item
 * @returns {'ok' | 'low' | 'out'}
 */
export function getStockStatus(item) {
  if (item.stock <= 0) return STOCK_STATUS.OUT;
  if (item.minPortions > 0 && item.stock < item.minPortions) return STOCK_STATUS.LOW;
  return STOCK_STATUS.OK;
}

/**
 * Texto del stock de un insumo. Un stock negativo se lee como faltante.
 * @param {import('./inventoryAdmin').InventoryItem} item
 * @returns {string}
 */
export function describeStock(item) {
  return item.stock < 0 ? `Faltan ${formatPortions(-item.stock, item)}` : formatPortions(item.stock, item);
}
