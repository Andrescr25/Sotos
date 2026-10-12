/**
 * Número visible del pedido: 24 -> "#024".
 * @param {number | null} number
 * @returns {string}
 */
export function formatOrderNumber(number) {
  if (!Number.isInteger(number)) return '—';
  return `#${String(number).padStart(3, '0')}`;
}
