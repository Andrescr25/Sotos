import { randomUUID } from 'node:crypto';
import {
  ROLES,
  USER_ERROR,
  UserError,
  normalizeUsername,
  validateNewAccount,
  validatePassword,
} from '@/domain/users';
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
 * @param {number} [deps.inviteTtlMs]  vigencia de un enlace de invitación (por defecto 7 días)
 * @param {() => Date} [deps.now]
 */
export function createAuthService({
  userStore,
  sessionTtlMs,
  inviteTtlMs = 7 * 24 * 60 * 60 * 1000,
  now = () => new Date(),
}) {
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

  /** Crea un enlace de un solo uso para que la cuenta ponga su contraseña. */
  async function issueInvitation(userId, createdById) {
    const token = generateToken();
    const created = now();
    const expiresAt = new Date(created.getTime() + inviteTtlMs).toISOString();
    await userStore.createInvitation({
      tokenHash: hashToken(token),
      userId,
      createdById: createdById ?? null,
      createdAt: created.toISOString(),
      expiresAt,
    });
    return { token, expiresAt };
  }

  return {
    async login({ username, password }) {
      const found = await userStore.findCredentials(normalizeUsername(username));
      const valid = await verifyPassword(
        String(password ?? ''),
        found?.passwordHash ? found.passwordHash : await dummyHash,
      );
      // Una cuenta invitada que todavía no creó su contraseña no puede entrar.
      if (!found || !found.passwordHash || !valid) {
        throw new UserError(USER_ERROR.INVALID_CREDENTIALS, 'Usuario o contraseña incorrectos');
      }
      if (!found.user.active) {
        throw new UserError(USER_ERROR.ACCOUNT_DISABLED, 'Tu cuenta está deshabilitada');
      }
      return openSession(found.user);
    },

    /**
     * El administrador crea la cuenta de un empleado y obtiene su enlace de
     * invitación. La cuenta nace con el rol elegido y sin contraseña.
     * @param {{ name: string, username: string, role?: string | null }} input
     * @param {string} createdById  administrador que la crea
     */
    async createAccount(input, createdById) {
      const { name, username, role } = validateNewAccount(input);
      const result = await userStore.createUser({
        id: randomUUID(),
        username,
        name,
        passwordHash: null,
        role,
        active: true,
        createdAt: now().toISOString(),
      });
      if (!result.ok) throw new UserError(result.code, result.message);

      return { user: result.user, invitation: await issueInvitation(result.user.id, createdById) };
    },

    /**
     * Genera un enlace nuevo para una cuenta existente: sirve para una
     * invitación que se perdió o venció, y para restablecer una contraseña
     * olvidada. El enlace anterior deja de funcionar.
     */
    async createInvitation(userId, createdById) {
      const user = await userStore.getUser(userId);
      if (!user) throw new UserError(USER_ERROR.USER_NOT_FOUND, 'El usuario no existe');
      if (!user.active) {
        throw new UserError(USER_ERROR.ACCOUNT_DISABLED, 'La cuenta está deshabilitada: habilítala primero');
      }
      return { user, invitation: await issueInvitation(userId, createdById) };
    },

    /**
     * Lo que se muestra al abrir el enlace, antes de crear la contraseña.
     * @param {string} token
     */
    async getInvitation(token) {
      const found = await userStore.getInvitation(hashToken(String(token ?? '')));
      if (!found) throw new UserError(USER_ERROR.INVITATION_INVALID, 'El enlace no es válido');
      if (found.usedAt) throw new UserError(USER_ERROR.INVITATION_USED, 'El enlace ya se usó');
      if (new Date(found.expiresAt).getTime() <= now().getTime()) {
        throw new UserError(USER_ERROR.INVITATION_EXPIRED, 'El enlace venció');
      }
      return {
        name: found.user.name,
        username: found.user.username,
        role: found.user.role,
        // Si ya tenía contraseña es un restablecimiento, no una primera vez.
        isReset: found.user.passwordSet,
        expiresAt: found.expiresAt,
      };
    },

    /**
     * El empleado crea su contraseña con el enlace y queda con la sesión abierta.
     * @param {string} token
     * @param {string} password
     */
    async acceptInvitation(token, password) {
      const clean = validatePassword(password);
      const result = await userStore.acceptInvitation({
        tokenHash: hashToken(String(token ?? '')),
        passwordHash: await hashPassword(clean),
        now: now(),
      });
      if (!result.ok) throw new UserError(result.code, 'El enlace no se puede usar');
      return openSession(result.user);
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
