export const CUSTOMER_NAME_MIN_LENGTH = 2;
export const CUSTOMER_NAME_MAX_LENGTH = 60;

/**
 * Nombre del cliente, sin espacios sobrantes ni dobles. No lanza: se usa
 * mientras la persona escribe.
 * @param {unknown} value
 * @returns {string}
 */
export function cleanCustomerName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, CUSTOMER_NAME_MAX_LENGTH);
}

/**
 * ¿Sirve como nombre de la cuenta? Al menos 2 caracteres y alguna letra, para
 * que no pasen "." o "--" solo para saltarse el campo. Admite "Mesa 5" o "Ana M.".
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidCustomerName(value) {
  const name = cleanCustomerName(value);
  return name.length >= CUSTOMER_NAME_MIN_LENGTH && /\p{L}/u.test(name);
}
