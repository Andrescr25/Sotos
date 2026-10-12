const THOUSANDS = /\B(?=(\d{3})+(?!\d))/g;

/**
 * Formatea un monto entero de colones: 12500 -> "₡12.500".
 * Se hace a mano (sin Intl) para que el resultado sea idéntico en todos los dispositivos.
 * @param {number} amount colones enteros
 * @returns {string}
 */
export function formatColones(amount) {
  const value = Math.round(Number(amount) || 0);
  const sign = value < 0 ? '-' : '';
  return `${sign}₡${Math.abs(value).toString().replace(THOUSANDS, '.')}`;
}
