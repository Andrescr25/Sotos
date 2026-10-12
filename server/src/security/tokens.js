import { createHash, randomBytes } from 'node:crypto';

/** Token de sesión aleatorio (256 bits). Solo lo conoce el dispositivo. */
export function generateToken() {
  return randomBytes(32).toString('base64url');
}

/**
 * En la base de datos solo se guarda el hash del token: si alguien lee la
 * tabla de sesiones no puede usar las sesiones activas.
 * @param {string} token
 */
export function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}
