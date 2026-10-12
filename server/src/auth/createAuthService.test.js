import { PGlite } from '@electric-sql/pglite';
import { USER_ERROR, ROLES } from '@/domain/users';
import { hashPassword, verifyPassword } from '../security/passwords';
import { generateToken, hashToken } from '../security/tokens';
import { createMemoryUserStore } from '../store/createMemoryUserStore';
import { createPostgresUserStore } from '../store/createPostgresUserStore';
import { createAuthService } from './createAuthService';

async function createPgliteUserStore() {
  const pglite = new PGlite();
  const store = createPostgresUserStore({
    query: (text, params) => pglite.query(text, params),
    transaction: (fn) => pglite.transaction((tx) => fn(tx)),
    close: () => pglite.close(),
  });
  await store.init();
  return store;
}

async function expectCode(promise, code) {
  await expect(promise).rejects.toMatchObject({ code });
}

describe('contraseñas y tokens', () => {
  it('verifica la contraseña correcta y rechaza la incorrecta', async () => {
    const hash = await hashPassword('secreta1');
    expect(hash).not.toContain('secreta1');
    expect(await verifyPassword('secreta1', hash)).toBe(true);
    expect(await verifyPassword('otra', hash)).toBe(false);
    expect(await verifyPassword('secreta1', 'formato-invalido')).toBe(false);
  });

  it('dos hashes de la misma contraseña son distintos (sal aleatoria)', async () => {
    expect(await hashPassword('igual')).not.toBe(await hashPassword('igual'));
  });

  it('los tokens son únicos y solo se guarda su hash', () => {
    const a = generateToken();
    expect(a).not.toBe(generateToken());
    expect(hashToken(a)).not.toContain(a);
    expect(hashToken(a)).toBe(hashToken(a));
  });
});

// El mismo comportamiento debe cumplirse con memoria y con Postgres.
describe.each([
  ['memoria', async () => createMemoryUserStore()],
  ['Postgres', createPgliteUserStore],
])('servicio de autenticación (%s)', (_name, createStore) => {
  let store;
  let clock;
  let auth;
  const HOUR = 60 * 60 * 1000;

  beforeEach(async () => {
    store = await createStore();
    clock = new Date('2026-10-12T12:00:00.000Z');
    auth = createAuthService({ userStore: store, sessionTtlMs: 24 * HOUR, now: () => clock });
  });

  afterEach(async () => {
    await store.close();
  });

  const ana = { name: 'Ana Mora', username: 'Ana', password: 'secreta1' };

  it('el registro crea una cuenta SIN rol y abre sesión', async () => {
    const { token, user } = await auth.register(ana);

    expect(user).toMatchObject({ username: 'ana', name: 'Ana Mora', role: null, active: true });
    expect(user).not.toHaveProperty('passwordHash');
    expect(await auth.authenticate(token)).toEqual(user);
  });

  it('no permite repetir el usuario (sin distinguir mayúsculas)', async () => {
    await auth.register(ana);
    await expectCode(auth.register({ ...ana, username: 'ANA' }), USER_ERROR.USERNAME_TAKEN);
  });

  it('valida los datos de registro', async () => {
    await expectCode(auth.register({ ...ana, password: '123' }), USER_ERROR.INVALID_PASSWORD);
    await expectCode(auth.register({ ...ana, username: 'a' }), USER_ERROR.INVALID_USERNAME);
  });

  it('inicia sesión con las credenciales correctas', async () => {
    await auth.register(ana);
    const { user } = await auth.login({ username: ' ANA ', password: 'secreta1' });
    expect(user.username).toBe('ana');
  });

  it('da el mismo error para usuario inexistente y contraseña incorrecta', async () => {
    await auth.register(ana);
    await expectCode(auth.login({ username: 'ana', password: 'mala' }), USER_ERROR.INVALID_CREDENTIALS);
    await expectCode(auth.login({ username: 'nadie', password: 'secreta1' }), USER_ERROR.INVALID_CREDENTIALS);
  });

  it('una sesión vence con el tiempo', async () => {
    const { token } = await auth.register(ana);

    clock = new Date(clock.getTime() + 23 * HOUR);
    expect(await auth.authenticate(token)).not.toBeNull();

    clock = new Date(clock.getTime() + 2 * HOUR);
    expect(await auth.authenticate(token)).toBeNull();
  });

  it('cerrar sesión invalida el token', async () => {
    const { token } = await auth.register(ana);
    await auth.logout(token);
    expect(await auth.authenticate(token)).toBeNull();
  });

  it('el administrador asigna rol y el cambio se refleja en la sesión abierta', async () => {
    const { token, user } = await auth.register(ana);
    expect((await auth.authenticate(token)).role).toBeNull();

    await auth.setAccess(user.id, { role: ROLES.COOK });

    expect((await auth.authenticate(token)).role).toBe(ROLES.COOK);
  });

  it('deshabilitar una cuenta cierra sus sesiones e impide volver a entrar', async () => {
    const { token, user } = await auth.register(ana);

    await auth.setAccess(user.id, { active: false });

    expect(await auth.authenticate(token)).toBeNull();
    await expectCode(auth.login({ username: 'ana', password: 'secreta1' }), USER_ERROR.ACCOUNT_DISABLED);
  });

  describe('administrador inicial', () => {
    const boot = { username: 'Dueño', password: 'clave-segura', name: 'Dueña del local' };

    it('crea el primer administrador cuando no hay ninguno', async () => {
      expect(await auth.ensureAdmin({ ...boot, username: 'duena' })).toBe('created');
      const { user } = await auth.login({ username: 'duena', password: 'clave-segura' });
      expect(user).toMatchObject({ role: ROLES.ADMIN, active: true });
    });

    it('no hace nada si ya existe uno', async () => {
      await auth.ensureAdmin({ ...boot, username: 'duena' });
      expect(await auth.ensureAdmin({ ...boot, username: 'otro' })).toBe('exists');
      await expectCode(auth.login({ username: 'otro', password: 'clave-segura' }), USER_ERROR.INVALID_CREDENTIALS);
    });

    it('promueve una cuenta existente con ese usuario', async () => {
      const { user } = await auth.register({ ...ana, username: 'duena' });
      expect(await auth.ensureAdmin({ ...boot, username: 'duena' })).toBe('promoted');
      expect((await auth.listUsers()).find((u) => u.id === user.id).role).toBe(ROLES.ADMIN);
    });

    it('avisa si faltan los datos de arranque', async () => {
      expect(await auth.ensureAdmin({ username: null, password: null })).toBe('missing');
    });
  });

  it('nunca deja al sistema sin administrador activo, ni con cambios simultáneos', async () => {
    await auth.ensureAdmin({ username: 'admin1', password: 'clave-segura' });
    const second = await auth.register({ ...ana, username: 'admin2' });
    await auth.setAccess(second.user.id, { role: ROLES.ADMIN });
    const [first] = (await auth.listUsers()).filter((u) => u.username === 'admin1');

    // Los dos administradores intentan quitarse el acceso a la vez.
    const results = await Promise.allSettled([
      auth.setAccess(first.id, { role: null }),
      auth.setAccess(second.user.id, { role: null }),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const admins = (await auth.listUsers()).filter((u) => u.role === ROLES.ADMIN && u.active);
    expect(admins).toHaveLength(1);
  });
});
