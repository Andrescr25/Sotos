/**
 * Configuración que se decide al compilar la app.
 *
 * Expo solo reemplaza `process.env.EXPO_PUBLIC_*` con acceso estático.
 * Estas variables quedan visibles dentro de la app: no son secretos.
 */

/** URL del servidor (Render). Vacía = modo en memoria, sin servidor. */
export const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';

/** `true` si la app trabaja contra el servidor; `false` en modo memoria (desarrollo). */
export const isRemote = Boolean(process.env.EXPO_PUBLIC_API_URL);

/**
 * Cuentas de ejemplo que la pantalla de login ofrece como atajo. Solo existen
 * en modo memoria; con servidor la lista está vacía.
 *
 * El `require` va dentro de la rama para que, al compilar con servidor, los
 * datos de ejemplo (y sus contraseñas de prueba) se descarten del paquete.
 */
export const devAccounts = process.env.EXPO_PUBLIC_API_URL
  ? []
  : require('@/data/seed/users').usersSeed.map(({ id, username, password }) => ({
      id,
      username,
      password,
    }));
