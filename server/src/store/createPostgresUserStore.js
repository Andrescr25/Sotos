import { USER_ERROR, applyAccessChange } from '@/domain/users';
import { USER_SCHEMA } from './schema';

const USER_COLUMNS = 'id, username, name, role, active, created_at, (password_hash IS NOT NULL) AS password_set';

const toUser = (row) => ({
  id: row.id,
  username: row.username,
  name: row.name,
  role: row.role,
  active: row.active,
  passwordSet: row.password_set,
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
      // ON CONFLICT cubre tanto un usuario repetido como dos altas simultáneas.
      const { rows } = await db.query(
        `INSERT INTO users (id, username, name, password_hash, role, active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (username) DO NOTHING
         RETURNING ${USER_COLUMNS}`,
        [record.id, record.username, record.name, record.passwordHash ?? null, record.role, record.active, record.createdAt],
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

    async createInvitation({ tokenHash, userId, createdById, createdAt, expiresAt }) {
      await db.transaction(async (tx) => {
        // Solo el último enlace sirve: se retiran los anteriores sin usar.
        await tx.query('DELETE FROM invitations WHERE user_id = $1 AND used_at IS NULL', [userId]);
        await tx.query(
          `INSERT INTO invitations (token_hash, user_id, created_by_id, created_at, expires_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [tokenHash, userId, createdById, createdAt, expiresAt],
        );
      });
    },

    async getInvitation(tokenHash) {
      const { rows } = await db.query(
        `SELECT i.expires_at, i.used_at, u.id, u.username, u.name, u.role, u.active, u.created_at,
                (u.password_hash IS NOT NULL) AS password_set
           FROM invitations i JOIN users u ON u.id = i.user_id
          WHERE i.token_hash = $1`,
        [tokenHash],
      );
      if (rows.length === 0) return null;
      const row = rows[0];
      return {
        user: toUser(row),
        expiresAt: new Date(row.expires_at).toISOString(),
        usedAt: row.used_at ? new Date(row.used_at).toISOString() : null,
      };
    },

    async acceptInvitation({ tokenHash, passwordHash, now }) {
      return db.transaction(async (tx) => {
        // Bloquea la invitación: dos aperturas simultáneas del mismo enlace
        // no pueden crear dos contraseñas.
        const found = await tx.query(
          'SELECT user_id, expires_at, used_at FROM invitations WHERE token_hash = $1 FOR UPDATE',
          [tokenHash],
        );
        if (found.rows.length === 0) return { ok: false, code: USER_ERROR.INVITATION_INVALID };

        const invitation = found.rows[0];
        if (invitation.used_at) return { ok: false, code: USER_ERROR.INVITATION_USED };
        if (new Date(invitation.expires_at).getTime() <= now.getTime()) {
          return { ok: false, code: USER_ERROR.INVITATION_EXPIRED };
        }

        const owner = await tx.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1 FOR UPDATE`, [
          invitation.user_id,
        ]);
        if (owner.rows.length === 0) return { ok: false, code: USER_ERROR.INVITATION_INVALID };
        if (!owner.rows[0].active) return { ok: false, code: USER_ERROR.ACCOUNT_DISABLED };

        await tx.query('UPDATE users SET password_hash = $2 WHERE id = $1', [
          invitation.user_id,
          passwordHash,
        ]);
        await tx.query('UPDATE invitations SET used_at = $2 WHERE token_hash = $1', [
          tokenHash,
          now.toISOString(),
        ]);
        // Una contraseña nueva cierra las sesiones anteriores de la cuenta.
        await tx.query('DELETE FROM sessions WHERE user_id = $1', [invitation.user_id]);

        return { ok: true, user: { ...toUser(owner.rows[0]), passwordSet: true } };
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
