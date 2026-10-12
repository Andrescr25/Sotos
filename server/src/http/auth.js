import { createHash, timingSafeEqual } from 'node:crypto';

const digest = (value) => createHash('sha256').update(String(value)).digest();

/**
 * Compara la clave recibida con la configurada en tiempo constante.
 * Sin `expectedKey` configurada (solo desarrollo) todo se permite.
 *
 * Aviso: es una barrera básica. La clave viaja dentro de la app de las tablets,
 * así que no es un secreto fuerte; la autenticación por usuario viene después.
 *
 * @param {string | null} expectedKey
 * @returns {(provided: unknown) => boolean}
 */
export function createKeyChecker(expectedKey) {
  if (!expectedKey) return () => true;
  const expected = digest(expectedKey);
  return (provided) =>
    typeof provided === 'string' && timingSafeEqual(digest(provided), expected);
}
