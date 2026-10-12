import { AppError, COMMON_ERROR } from '@/shared/errors/AppError';

/**
 * Cliente HTTP del servidor. Agrega el token de sesión, convierte las
 * respuestas de error en `AppError` con su `code` y, si el servidor rechaza
 * la sesión (401 con token), la expira para que la app vuelva al login.
 *
 * @param {Object} options
 * @param {string} options.baseUrl  p. ej. "https://sotos.onrender.com"
 * @param {ReturnType<import('@/data/session/createSessionStore').createSessionStore>} options.session
 * @param {typeof fetch} [options.fetchImpl]
 */
export function createHttpClient({ baseUrl, session, fetchImpl = globalThis.fetch }) {
  const root = baseUrl.replace(/\/+$/, '');

  /**
   * @param {string} method
   * @param {string} path
   * @param {{ body?: unknown, authenticated?: boolean }} [options]
   *   `authenticated: false` para login y registro: un 401 ahí significa
   *   "credenciales incorrectas", no "sesión vencida".
   */
  async function request(method, path, { body, authenticated = true } = {}) {
    const token = authenticated ? session.get() : null;

    let response;
    try {
      response = await fetchImpl(`${root}${path}`, {
        method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new AppError(COMMON_ERROR.NETWORK, 'No hay conexión con el servidor');
    }

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401 && token) await session.expire();
      throw new AppError(
        payload?.error?.code ?? `http_${response.status}`,
        payload?.error?.message ?? `El servidor respondió ${response.status}`,
      );
    }
    return payload;
  }

  return {
    root,
    get: (path, options) => request('GET', path, options),
    post: (path, body, options) => request('POST', path, { ...options, body }),
    put: (path, body, options) => request('PUT', path, { ...options, body }),
    patch: (path, body, options) => request('PATCH', path, { ...options, body }),
  };
}
