import { usersSeed } from '@/data/seed/users';

/**
 * Configuración que se decide al compilar la app.
 *
 * Expo solo reemplaza `process.env.EXPO_PUBLIC_*` con acceso estático.
 * Estas variables quedan visibles dentro de la app: no son secretos.
 */

/** URL del servidor (Render). Vacía = modo en memoria, sin servidor. */
export const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';

/** `true` si la app trabaja contra el servidor; `false` en modo memoria (desarrollo). */
export const isRemote = Boolean(apiUrl);

/**
 * Cuentas de ejemplo que la pantalla de login ofrece como atajo. Solo existen
 * en modo memoria; con servidor real la lista está vacía.
 */
export const devAccounts = isRemote
  ? []
  : usersSeed.map(({ id, username, password }) => ({ id, username, password }));
