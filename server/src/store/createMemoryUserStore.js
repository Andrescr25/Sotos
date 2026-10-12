import { USER_ERROR, applyAccessChange } from '@/domain/users';

const toPublic = ({ passwordHash, ...user }) => user;

/**
 * Almacén de usuarios y sesiones en memoria (desarrollo y pruebas).
 * Mismo contrato que createPostgresUserStore.
 *
 * @returns {import('./contracts').UserStore}
 */
export function createMemoryUserStore() {
  /** @type {Map<string, object>} id -> usuario con passwordHash */
  const users = new Map();
  /** @type {Map<string, { userId: string, expiresAt: string }>} */
  const sessions = new Map();

  return {
    async init() {},

    async createUser(record) {
      const taken = [...users.values()].some((user) => user.username === record.username);
      if (taken) {
        return { ok: false, code: USER_ERROR.USERNAME_TAKEN, message: 'Ese usuario ya existe' };
      }
      users.set(record.id, { ...record });
      return { ok: true, user: toPublic(record) };
    },

    async findCredentials(username) {
      const record = [...users.values()].find((user) => user.username === username);
      return record ? { user: toPublic(record), passwordHash: record.passwordHash } : null;
    },

    async getUser(id) {
      const record = users.get(id);
      return record ? toPublic(record) : null;
    },

    async listUsers() {
      return [...users.values()]
        .map(toPublic)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    },

    // Sin `await` entre leer y escribir: atómico en un solo hilo.
    async updateAccess(id, changes) {
      const all = [...users.values()].map(toPublic);
      const updated = applyAccessChange(all, id, changes);
      users.set(id, { ...users.get(id), role: updated.role, active: updated.active });
      return updated;
    },

    async countUsers() {
      return users.size;
    },

    async hasAdmin() {
      return [...users.values()].some((user) => user.role === 'admin');
    },

    async createSession(session) {
      sessions.set(session.tokenHash, { userId: session.userId, expiresAt: session.expiresAt });
    },

    async getSession(tokenHash) {
      return sessions.get(tokenHash) ?? null;
    },

    async deleteSession(tokenHash) {
      sessions.delete(tokenHash);
    },

    async deleteSessionsOfUser(userId) {
      sessions.forEach((session, key) => {
        if (session.userId === userId) sessions.delete(key);
      });
    },

    async close() {},
  };
}
