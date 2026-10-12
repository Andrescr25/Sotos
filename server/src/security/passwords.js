import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const SCHEME = 'scrypt';

/**
 * Hash de contraseña con scrypt (incluido en Node, sin dependencias).
 * Formato guardado: "scrypt$<sal base64>$<hash base64>".
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH);
  return `${SCHEME}$${salt.toString('base64')}$${key.toString('base64')}`;
}

/**
 * @param {string} password
 * @param {string} stored  valor producido por hashPassword
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, stored) {
  const [scheme, saltBase64, keyBase64] = String(stored).split('$');
  if (scheme !== SCHEME || !saltBase64 || !keyBase64) return false;

  const expected = Buffer.from(keyBase64, 'base64');
  const actual = await scrypt(password, Buffer.from(saltBase64, 'base64'), expected.length);
  return timingSafeEqual(actual, expected);
}
