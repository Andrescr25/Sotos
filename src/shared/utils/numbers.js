/**
 * Lee un entero escrito por una persona ("12", " 3 "). Devuelve null si está
 * vacío o no es un entero (con decimales, signos, letras o separadores).
 * Para montos en colones usar `parseColones`, que acepta "3.500" como 3500.
 * @param {string} text
 * @returns {number | null}
 */
export function parseWholeNumber(text) {
  const cleaned = String(text ?? '').trim();
  return /^\d{1,9}$/.test(cleaned) ? Number(cleaned) : null;
}
