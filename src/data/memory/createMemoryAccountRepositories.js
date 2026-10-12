import { usersSeed } from '@/data/seed/users';
import {
  PERMISSIONS,
  USER_ERROR,
  UserError,
  applyAccessChange,
  can,
  normalizeUsername,
  validateRegistration,
} from '@/domain/users';
import { createEventEmitter } from '@/shared/utils/createEventEmitter';
import { createId } from '@/shared/utils/createId';

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
    users.set(user.id, { ...user });
    passwords.set(user.id, password);
  });

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

  const authRepository = {
    async restore() {
      return getCurrentUser();
    },

    async register(input) {
      const { name, username, password } = validateRegistration(input);
      if ([...users.values()].some((user) => user.username === username)) {
        throw new UserError(USER_ERROR.USERNAME_TAKEN, 'Ese usuario ya existe');
      }
      const user = {
        id: createId('user'),
        username,
        name,
        role: null,
        active: true,
        createdAt: now().toISOString(),
      };
      users.set(user.id, user);
      passwords.set(user.id, password);
      currentId = user.id;
      events.emit({ type: 'users:changed' });
      return getCurrentUser();
    },

    async login({ username, password }) {
      const found = [...users.values()].find((user) => user.username === normalizeUsername(username));
      if (!found || passwords.get(found.id) !== String(password ?? '')) {
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
