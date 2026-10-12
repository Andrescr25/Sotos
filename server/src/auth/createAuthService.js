import { randomUUID } from 'node:crypto';
import { USER_ERROR, UserError, ROLES, validateRegistration, normalizeUsername } from '@/domain/users';
import { hashPassword, verifyPassword } from '../security/passwords';
import { generateToken, hashToken } from '../security/tokens';

/**
 * Casos de uso de cuentas y sesiones del servidor.
 *
 * El usuario nunca elige su rol: `register` crea la cuenta sin acceso
 * (role null) y es un administrador quien lo asigna con `setAccess`.
 *
 * @param {Object} deps
 * @param {import('../store/contracts').UserStore} deps.userStore
 * @param {number} deps.sessionTtlMs
 * @param {() => Date} [deps.now]
 */
export function createAuthService({ userStore, sessionTtlMs, now = () => new Date() }) {
  // Hash falso para que "usuario inexistente" tarde lo mismo que "contraseña
  // incorrecta" y no se pueda averiguar qué usuarios existen midiendo el tiempo.
  const dummyHash = hashPassword('sin-usuario');

  async function openSession(user) {
    const token = generateToken();
    const created = now();
    await userStore.createSession({
      tokenHash: hashToken(token),
      userId: user.id,
      createdAt: created.toISOString(),
      expiresAt: new Date(created.getTime() + sessionTtlMs).toISOString(),
    });
    return { token, user };
  }

  return {
    /** Crea una cuenta sin rol y abre sesión. */
    async register(input) {
      const { name, username, password } = validateRegistration(input);
      const result = await userStore.createUser({
        id: randomUUID(),
        username,
        name,
        passwordHash: await hashPassword(password),
        role: null,
        active: true,
        createdAt: now().toISOString(),
      });
      if (!result.ok) throw new UserError(result.code, result.message);
      return openSession(result.user);
    },

    async login({ username, password }) {
      const found = await userStore.findCredentials(normalizeUsername(username));
      const valid = await verifyPassword(
        String(password ?? ''),
        found ? found.passwordHash : await dummyHash,
      );
      if (!found || !valid) {
        throw new UserError(USER_ERROR.INVALID_CREDENTIALS, 'Usuario o contraseña incorrectos');
      }
      if (!found.user.active) {
        throw new UserError(USER_ERROR.ACCOUNT_DISABLED, 'Tu cuenta está deshabilitada');
      }
      return openSession(found.user);
    },

    /** @returns {Promise<import('@/domain/users/roles').User | null>} null si el token no sirve */
    async authenticate(token) {
      if (typeof token !== 'string' || token.length === 0) return null;
      const tokenHash = hashToken(token);
      const session = await userStore.getSession(tokenHash);
      if (!session) return null;

      if (new Date(session.expiresAt).getTime() <= now().getTime()) {
        await userStore.deleteSession(tokenHash);
        return null;
      }
      const user = await userStore.getUser(session.userId);
      return user && user.active ? user : null;
    },

    async logout(token) {
      await userStore.deleteSession(hashToken(token));
    },

    listUsers: () => userStore.listUsers(),

    /**
     * Asigna rol y/o habilita o deshabilita una cuenta. Al deshabilitarla se
     * cierran sus sesiones.
     */
    async setAccess(id, changes) {
      const updated = await userStore.updateAccess(id, changes);
      if (!updated.active) await userStore.deleteSessionsOfUser(id);
      return updated;
    },

    /**
     * Garantiza que exista un administrador con los datos de arranque
     * (variables ADMIN_*). No hace nada si ya hay alguno.
     * @returns {Promise<'exists' | 'created' | 'promoted' | 'missing'>}
     */
    async ensureAdmin({ username, password, name }) {
      if (await userStore.hasAdmin()) return 'exists';
      if (!username || !password) return 'missing';

      const normalized = normalizeUsername(username);
      const existing = await userStore.findCredentials(normalized);
      if (existing) {
        await userStore.updateAccess(existing.user.id, { role: ROLES.ADMIN, active: true });
        return 'promoted';
      }

      const result = await userStore.createUser({
        id: randomUUID(),
        username: normalized,
        name: name || 'Administrador',
        passwordHash: await hashPassword(password),
        role: ROLES.ADMIN,
        active: true,
        createdAt: now().toISOString(),
      });
      if (!result.ok) throw new UserError(result.code, result.message);
      return 'created';
    },
  };
}
