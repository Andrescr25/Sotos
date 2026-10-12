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

/**
 * Lee un monto escrito por una persona y lo devuelve como colones enteros.
 * Acepta "3500", "3.500", "₡3 500". Devuelve null si está vacío o no es un
 * entero válido (por ejemplo, con decimales o letras).
 * @param {string} text
 * @returns {number | null}
 */
export function parseColones(text) {
  const cleaned = String(text ?? '')
    .replace(/[₡\s.]/g, '')
    .trim();
  if (cleaned === '' || !/^\d+$/.test(cleaned)) return null;
  return Number(cleaned);
}
