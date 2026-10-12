import { usersSeed } from '@/data/seed/users';
import {
  PERMISSIONS,
  USER_ERROR,
  UserError,
  applyAccessChange,
  can,
  normalizeUsername,
  validateNewAccount,
  validatePassword,
} from '@/domain/users';
import { createEventEmitter } from '@/shared/utils/createEventEmitter';
import { createId } from '@/shared/utils/createId';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Cuentas y sesión en memoria, para desarrollar sin servidor. Un solo
 * dispositivo = una sola sesión a la vez. Aplica las mismas reglas de dominio
 * que el servidor (validación, "queda al menos un admin", permisos).
 *
 * Las contraseñas del seed están en texto plano: solo para desarrollo.
 *
 * @param {{ seed?: typeof usersSeed, now?: () => Date }} [options]
 * @returns {{
 *   authRepository: import('@/data/contracts').AuthRepository,
 *   userRepository: import('@/data/contracts').UserRepository,
 *   getCurrentUser: () => import('@/domain/users/roles').User | null,
 * }}
 */
export function createMemoryAccountRepositories({ seed = usersSeed, now = () => new Date() } = {}) {
  /** @type {Map<string, import('@/domain/users/roles').User>} */
  const users = new Map();
  /** @type {Map<string, string>} id -> contraseña */
  const passwords = new Map();
  seed.forEach(({ password, ...user }) => {
    users.set(user.id, { ...user, passwordSet: true });
    passwords.set(user.id, password);
  });
  /** @type {Map<string, { userId: string, expiresAt: string, usedAt: string | null }>} token -> invitación */
  const invitations = new Map();

  let currentId = null;
  const events = createEventEmitter();

  const getCurrentUser = () => (currentId ? { ...users.get(currentId) } : null);

  function requireUser() {
    const user = getCurrentUser();
    if (!user) throw new UserError(USER_ERROR.UNAUTHORIZED, 'Inicia sesión para continuar');
    return user;
  }

  function requireManager() {
    const user = requireUser();
    if (!can(user.role, PERMISSIONS.USER_MANAGE)) {
      throw new UserError(USER_ERROR.FORBIDDEN, 'Tu rol no tiene permiso para realizar esta acción');
    }
  }

  /** Crea un enlace nuevo y retira los anteriores sin usar de esa cuenta. */
  function issueInvitation(userId) {
    invitations.forEach((invitation, key) => {
      if (invitation.userId === userId && !invitation.usedAt) invitations.delete(key);
    });
    const token = createId('invite');
    const expiresAt = new Date(now().getTime() + INVITE_TTL_MS).toISOString();
    invitations.set(token, { userId, expiresAt, usedAt: null });
    return { token, expiresAt };
  }

  const authRepository = {
    async restore() {
      return getCurrentUser();
    },

    async login({ username, password }) {
      const found = [...users.values()].find((user) => user.username === normalizeUsername(username));
      // Una cuenta invitada sin contraseña todavía no puede entrar.
      if (!found || !found.passwordSet || passwords.get(found.id) !== String(password ?? '')) {
        throw new UserError(USER_ERROR.INVALID_CREDENTIALS, 'Usuario o contraseña incorrectos');
      }
      if (!found.active) {
        throw new UserError(USER_ERROR.ACCOUNT_DISABLED, 'Tu cuenta está deshabilitada');
      }
      currentId = found.id;
      return getCurrentUser();
    },

    async logout() {
      currentId = null;
    },

    async refresh() {
      return requireUser();
    },

    async getInvitation(token) {
      const invitation = invitations.get(token);
      const user = invitation ? users.get(invitation.userId) : null;
      if (!invitation || !user) {
        throw new UserError(USER_ERROR.INVITATION_INVALID, 'El enlace no es válido');
      }
      if (invitation.usedAt) throw new UserError(USER_ERROR.INVITATION_USED, 'El enlace ya se usó');
      if (new Date(invitation.expiresAt).getTime() <= now().getTime()) {
        throw new UserError(USER_ERROR.INVITATION_EXPIRED, 'El enlace venció');
      }
      return {
        name: user.name,
        username: user.username,
        role: user.role,
        isReset: user.passwordSet,
        expiresAt: invitation.expiresAt,
      };
    },

    async acceptInvitation(token, password) {
      const clean = validatePassword(password);
      await authRepository.getInvitation(token); // valida: existe, no usado, no vencido
      const invitation = invitations.get(token);
      const user = users.get(invitation.userId);
      if (!user.active) {
        throw new UserError(USER_ERROR.ACCOUNT_DISABLED, 'Tu cuenta está deshabilitada');
      }

      passwords.set(user.id, clean);
      users.set(user.id, { ...user, passwordSet: true });
      invitation.usedAt = now().toISOString();
      currentId = user.id;
      events.emit({ type: 'users:changed' });
      return getCurrentUser();
    },

    subscribe(listener) {
      return events.subscribe((event) => {
        if (event.type === 'user:updated' || event.type === 'session:expired') listener(event);
      });
    },
  };

  const userRepository = {
    async list() {
      requireManager();
      return [...users.values()]
        .map((user) => ({ ...user }))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    },

    async createAccount(input) {
      requireManager();
      const { name, username, role } = validateNewAccount(input);
      if ([...users.values()].some((user) => user.username === username)) {
        throw new UserError(USER_ERROR.USERNAME_TAKEN, 'Ese usuario ya existe');
      }
      const user = {
        id: createId('user'),
        username,
        name,
        role,
        active: true,
        passwordSet: false,
        createdAt: now().toISOString(),
      };
      users.set(user.id, user);
      events.emit({ type: 'users:changed' });
      return { user: { ...user }, invitation: issueInvitation(user.id) };
    },

    async createInvitation(userId) {
      requireManager();
      const user = users.get(userId);
      if (!user) throw new UserError(USER_ERROR.USER_NOT_FOUND, 'El usuario no existe');
      if (!user.active) {
        throw new UserError(USER_ERROR.ACCOUNT_DISABLED, 'La cuenta está deshabilitada: habilítala primero');
      }
      events.emit({ type: 'users:changed' });
      return { user: { ...user }, invitation: issueInvitation(userId) };
    },

    async setAccess(id, changes) {
      requireManager();
      const updated = applyAccessChange([...users.values()], id, changes);
      users.set(id, updated);

      if (id === currentId) {
        if (updated.active) {
          events.emit({ type: 'user:updated', user: { ...updated } });
        } else {
          currentId = null;
          events.emit({ type: 'session:expired' });
        }
      }
      events.emit({ type: 'users:changed' });
      return { ...updated };
    },

    subscribe(listener) {
      return events.subscribe((event) => {
        if (event.type === 'users:changed') listener(event);
      });
    },
  };

  return { authRepository, userRepository, getCurrentUser };
}
