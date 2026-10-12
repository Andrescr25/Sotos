import { USER_ERROR, applyAccessChange } from '@/domain/users';
import { USER_SCHEMA } from './schema';

const USER_COLUMNS = 'id, username, name, role, active, created_at';

const toUser = (row) => ({
  id: row.id,
  username: row.username,
  name: row.name,
  role: row.role,
  active: row.active,
  createdAt: new Date(row.created_at).toISOString(),
});

/**
 * Almacén de usuarios y sesiones sobre Postgres. Usa la misma forma de `db`
 * que createPostgresStore.
 *
 * @param {Object} db  { query(text, params), transaction(fn), close() }
 * @returns {import('./contracts').UserStore}
 */
export function createPostgresUserStore(db) {
  return {
    async init() {
      for (const statement of USER_SCHEMA) {
        await db.query(statement);
      }
    },

    async createUser(record) {
      // ON CONFLICT cubre tanto un usuario repetido como dos registros simultáneos.
      const { rows } = await db.query(
        `INSERT INTO users (id, username, name, password_hash, role, active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (username) DO NOTHING
         RETURNING ${USER_COLUMNS}`,
        [record.id, record.username, record.name, record.passwordHash, record.role, record.active, record.createdAt],
      );
      if (rows.length === 0) {
        return { ok: false, code: USER_ERROR.USERNAME_TAKEN, message: 'Ese usuario ya existe' };
      }
      return { ok: true, user: toUser(rows[0]) };
    },

    async findCredentials(username) {
      const { rows } = await db.query(
        `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE username = $1`,
        [username],
      );
      if (rows.length === 0) return null;
      return { user: toUser(rows[0]), passwordHash: rows[0].password_hash };
    },

    async getUser(id) {
      const { rows } = await db.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
      return rows[0] ? toUser(rows[0]) : null;
    },

    async listUsers() {
      const { rows } = await db.query(
        `SELECT ${USER_COLUMNS} FROM users ORDER BY created_at ASC, id ASC`,
      );
      return rows.map(toUser);
    },

    async updateAccess(id, changes) {
      return db.transaction(async (tx) => {
        // Se bloquean todas las filas: la regla "queda al menos un admin" mira
        // al conjunto, y dos cambios simultáneos no deben saltársela.
        const { rows } = await tx.query(
          `SELECT ${USER_COLUMNS} FROM users ORDER BY created_at ASC, id ASC FOR UPDATE`,
        );
        const updated = applyAccessChange(rows.map(toUser), id, changes);
        await tx.query('UPDATE users SET role = $2, active = $3 WHERE id = $1', [
          id,
          updated.role,
          updated.active,
        ]);
        return updated;
      });
    },

    async countUsers() {
      const { rows } = await db.query('SELECT count(*)::int AS total FROM users');
      return rows[0].total;
    },

    async hasAdmin() {
      const { rows } = await db.query(`SELECT 1 FROM users WHERE role = 'admin' LIMIT 1`);
      return rows.length > 0;
    },

    async createSession({ tokenHash, userId, createdAt, expiresAt }) {
      await db.query(
        'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES ($1, $2, $3, $4)',
        [tokenHash, userId, createdAt, expiresAt],
      );
    },

    async getSession(tokenHash) {
      const { rows } = await db.query(
        'SELECT user_id, expires_at FROM sessions WHERE token_hash = $1',
        [tokenHash],
      );
      if (rows.length === 0) return null;
      return { userId: rows[0].user_id, expiresAt: new Date(rows[0].expires_at).toISOString() };
    },

    async deleteSession(tokenHash) {
      await db.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
    },

    async deleteSessionsOfUser(userId) {
      await db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    },

    async close() {
      await db.close?.();
    },
  };
}
