import { validateRegistration } from '@/domain/users';

/**
 * Repositorios remotos de sesión y de usuarios.
 *
 * @param {Object} deps
 * @param {ReturnType<import('./createHttpClient').createHttpClient>} deps.http
 * @param {ReturnType<import('./createRealtimeClient').createRealtimeClient>} deps.realtime
 * @param {ReturnType<import('@/data/session/createSessionStore').createSessionStore>} deps.session
 * @returns {{ authRepository: import('@/data/contracts').AuthRepository, userRepository: import('@/data/contracts').UserRepository }}
 */
export function createRemoteAccountRepositories({ http, realtime, session }) {
  const authRepository = {
    async restore() {
      const token = await session.load();
      if (!token) return null;
      try {
        const payload = await http.get('/auth/me');
        return payload.user;
      } catch (error) {
        // 401: el cliente HTTP ya olvidó el token. Sin red: se deja pasar el
        // error para que la app pueda reintentar sin perder la sesión.
        if (error.code === 'network') throw error;
        return null;
      }
    },

    async register(input) {
      const data = validateRegistration(input);
      const payload = await http.post('/auth/register', data, { authenticated: false });
      await session.set(payload.token);
      return payload.user;
    },

    async login({ username, password }) {
      const payload = await http.post(
        '/auth/login',
        { username, password },
        { authenticated: false },
      );
      await session.set(payload.token);
      return payload.user;
    },

    async logout() {
      try {
        await http.post('/auth/logout');
      } catch {
        // Aunque el servidor no responda, este dispositivo cierra su sesión.
      }
      await session.clear();
    },

    async refresh() {
      const payload = await http.get('/auth/me');
      return payload.user;
    },

    subscribe(listener) {
      const stopRealtime = realtime.subscribe((event) => {
        if (event.type === 'user:updated' || event.type === 'connection') listener(event);
      });
      const stopSession = session.subscribe(listener);
      return () => {
        stopRealtime();
        stopSession();
      };
    },
  };

  const userRepository = {
    async list() {
      const payload = await http.get('/users');
      return payload.users;
    },

    async setAccess(id, changes) {
      const payload = await http.patch(`/users/${encodeURIComponent(id)}`, changes);
      return payload.user;
    },

    subscribe(listener) {
      return realtime.subscribe((event) => {
        if (event.type === 'users:changed' || event.type === 'connection') listener(event);
      });
    },
  };

  return { authRepository, userRepository };
}
