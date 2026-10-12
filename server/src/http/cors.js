/**
 * Control de orígenes para la app en el navegador (CORS).
 *
 * Las apps nativas (Expo Go, la app instalada) no usan CORS: solo importa
 * cuando la app corre como página web. Aquí la API no usa cookies —se
 * autentica con un token en la cabecera `Authorization`—, así que permitir un
 * origen no le da a esa página nada que no tenga ya con un token válido.
 *
 * Siempre se permite `localhost`/`127.0.0.1` (desarrollo). Otros orígenes, por
 * ejemplo la app web publicada, se listan en CORS_ORIGIN (o "*" para todos).
 */
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/;

/**
 * @param {string | undefined} origin  cabecera Origin de la petición
 * @param {string[]} [allowed]  orígenes extra permitidos
 * @returns {string | null}  valor para Access-Control-Allow-Origin, o null si no se permite
 */
export function resolveCorsOrigin(origin, allowed = []) {
  if (!origin) return null;
  if (allowed.includes('*')) return '*';
  if (allowed.includes(origin) || LOCAL_ORIGIN.test(origin)) return origin;
  return null;
}
