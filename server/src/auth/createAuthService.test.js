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

  /**
   * Alta como en la vida real: un administrador crea la cuenta y la persona
   * crea su contraseña con el enlace. Devuelve la sesión abierta.
   */
  async function signUp({ name, username, password }, role = null) {
    const { invitation } = await auth.createAccount({ name, username, role }, null);
    return auth.acceptInvitation(invitation.token, password);
  }

  it('no hay registro abierto: el servicio no ofrece crear cuentas propias', () => {
    expect(auth.register).toBeUndefined();
  });

  it('una cuenta dada de alta queda sin rol y con la sesión abierta', async () => {
    const { token, user } = await signUp(ana);

    expect(user).toMatchObject({ username: 'ana', name: 'Ana Mora', role: null, active: true, passwordSet: true });
    expect(user).not.toHaveProperty('passwordHash');
    expect(await auth.authenticate(token)).toEqual(user);
  });

  it('no permite repetir el usuario (sin distinguir mayúsculas)', async () => {
    await signUp(ana);
    await expectCode(auth.createAccount({ name: 'Otra Ana', username: 'ANA' }, null), USER_ERROR.USERNAME_TAKEN);
  });

  it('valida los datos de la cuenta y de la contraseña', async () => {
    await expectCode(auth.createAccount({ name: 'Ana', username: 'a' }, null), USER_ERROR.INVALID_USERNAME);
    await expectCode(auth.createAccount({ name: 'A', username: 'ana' }, null), USER_ERROR.INVALID_NAME);

    const { invitation } = await auth.createAccount({ name: 'Ana Mora', username: 'ana' }, null);
    await expectCode(auth.acceptInvitation(invitation.token, '123'), USER_ERROR.INVALID_PASSWORD);
  });

  it('inicia sesión con las credenciales correctas', async () => {
    await signUp(ana);
    const { user } = await auth.login({ username: ' ANA ', password: 'secreta1' });
    expect(user.username).toBe('ana');
  });

  it('da el mismo error para usuario inexistente y contraseña incorrecta', async () => {
    await signUp(ana);
    await expectCode(auth.login({ username: 'ana', password: 'mala' }), USER_ERROR.INVALID_CREDENTIALS);
    await expectCode(auth.login({ username: 'nadie', password: 'secreta1' }), USER_ERROR.INVALID_CREDENTIALS);
  });

  it('una sesión vence con el tiempo', async () => {
    const { token } = await signUp(ana);

    clock = new Date(clock.getTime() + 23 * HOUR);
    expect(await auth.authenticate(token)).not.toBeNull();

    clock = new Date(clock.getTime() + 2 * HOUR);
    expect(await auth.authenticate(token)).toBeNull();
  });

  it('cerrar sesión invalida el token', async () => {
    const { token } = await signUp(ana);
    await auth.logout(token);
    expect(await auth.authenticate(token)).toBeNull();
  });

  it('el administrador asigna rol y el cambio se refleja en la sesión abierta', async () => {
    const { token, user } = await signUp(ana);
    expect((await auth.authenticate(token)).role).toBeNull();

    await auth.setAccess(user.id, { role: ROLES.COOK });

    expect((await auth.authenticate(token)).role).toBe(ROLES.COOK);
  });

  it('deshabilitar una cuenta cierra sus sesiones e impide volver a entrar', async () => {
    const { token, user } = await signUp(ana);

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
      const { user } = await signUp({ ...ana, username: 'duena' });
      expect(await auth.ensureAdmin({ ...boot, username: 'duena' })).toBe('promoted');
      expect((await auth.listUsers()).find((u) => u.id === user.id).role).toBe(ROLES.ADMIN);
    });

    it('avisa si faltan los datos de arranque', async () => {
      expect(await auth.ensureAdmin({ username: null, password: null })).toBe('missing');
    });
  });

  describe('invitaciones', () => {
    const DAY = 24 * HOUR;
    const input = { name: 'Luis Rojas', username: 'Luis', role: ROLES.COOK };

    it('el admin crea la cuenta con rol y sin contraseña, y recibe un enlace', async () => {
      const { user, invitation } = await auth.createAccount(input, 'admin-1');

      expect(user).toMatchObject({
        username: 'luis',
        name: 'Luis Rojas',
        role: ROLES.COOK,
        active: true,
        passwordSet: false,
      });
      expect(user).not.toHaveProperty('passwordHash');
      expect(invitation.token.length).toBeGreaterThan(30);
      expect(new Date(invitation.expiresAt).getTime()).toBe(clock.getTime() + 7 * DAY);
    });

    it('el token no se guarda en claro y la cuenta no puede entrar sin contraseña', async () => {
      const { invitation } = await auth.createAccount(input, 'admin-1');

      const stored = await store.getInvitation(hashToken(invitation.token));
      expect(stored.user.username).toBe('luis');
      expect(await store.getInvitation(invitation.token)).toBeNull(); // el token plano no es la clave

      for (const password of ['', 'cualquiera', invitation.token]) {
        await expectCode(auth.login({ username: 'luis', password }), USER_ERROR.INVALID_CREDENTIALS);
      }
    });

    it('al abrir el enlace se ve a quién pertenece', async () => {
      const { invitation } = await auth.createAccount(input, 'admin-1');

      expect(await auth.getInvitation(invitation.token)).toMatchObject({
        name: 'Luis Rojas',
        username: 'luis',
        role: ROLES.COOK,
        isReset: false,
      });
    });

    it('crear la contraseña abre la sesión con el rol asignado y permite volver a entrar', async () => {
      const { invitation } = await auth.createAccount(input, 'admin-1');

      const { token, user } = await auth.acceptInvitation(invitation.token, 'clave-segura');

      expect(user).toMatchObject({ role: ROLES.COOK, passwordSet: true });
      expect((await auth.authenticate(token)).username).toBe('luis');
      const again = await auth.login({ username: 'luis', password: 'clave-segura' });
      expect(again.user.role).toBe(ROLES.COOK);
    });

    it('el enlace sirve una sola vez', async () => {
      const { invitation } = await auth.createAccount(input, 'admin-1');
      await auth.acceptInvitation(invitation.token, 'clave-segura');

      await expectCode(auth.acceptInvitation(invitation.token, 'otra-clave'), USER_ERROR.INVITATION_USED);
      await expectCode(auth.getInvitation(invitation.token), USER_ERROR.INVITATION_USED);
      // La contraseña quedó como la primera.
      await expect(auth.login({ username: 'luis', password: 'clave-segura' })).resolves.toBeTruthy();
      await expectCode(auth.login({ username: 'luis', password: 'otra-clave' }), USER_ERROR.INVALID_CREDENTIALS);
    });

    it('dos aperturas simultáneas del mismo enlace crean una sola contraseña', async () => {
      const { invitation } = await auth.createAccount(input, 'admin-1');

      const results = await Promise.allSettled([
        auth.acceptInvitation(invitation.token, 'clave-uno'),
        auth.acceptInvitation(invitation.token, 'clave-dos'),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(results.find((r) => r.status === 'rejected').reason.code).toBe(USER_ERROR.INVITATION_USED);
    });

    it('un enlace inexistente o vencido se rechaza con su código', async () => {
      await expectCode(auth.getInvitation('no-existe'), USER_ERROR.INVITATION_INVALID);
      await expectCode(auth.acceptInvitation('no-existe', 'clave-segura'), USER_ERROR.INVITATION_INVALID);

      const { invitation } = await auth.createAccount(input, 'admin-1');
      clock = new Date(clock.getTime() + 8 * DAY);

      await expectCode(auth.getInvitation(invitation.token), USER_ERROR.INVITATION_EXPIRED);
      await expectCode(auth.acceptInvitation(invitation.token, 'clave-segura'), USER_ERROR.INVITATION_EXPIRED);
    });

    it('una contraseña débil no consume el enlace', async () => {
      const { invitation } = await auth.createAccount(input, 'admin-1');

      await expectCode(auth.acceptInvitation(invitation.token, '123'), USER_ERROR.INVALID_PASSWORD);

      await expect(auth.acceptInvitation(invitation.token, 'clave-segura')).resolves.toBeTruthy();
    });

    it('un enlace nuevo reemplaza al anterior', async () => {
      const first = await auth.createAccount(input, 'admin-1');
      const { invitation: second } = await auth.createInvitation(first.user.id, 'admin-1');

      await expectCode(auth.getInvitation(first.invitation.token), USER_ERROR.INVITATION_INVALID);
      await expect(auth.getInvitation(second.token)).resolves.toMatchObject({ username: 'luis' });
    });

    it('restablecer: cambia la contraseña y cierra las sesiones anteriores', async () => {
      const { user } = await signUp({ name: 'Ana Mora', username: 'ana', password: 'vieja-clave' });
      const old = await auth.login({ username: 'ana', password: 'vieja-clave' });

      const { invitation } = await auth.createInvitation(user.id, 'admin-1');
      expect(await auth.getInvitation(invitation.token)).toMatchObject({ isReset: true });
      const fresh = await auth.acceptInvitation(invitation.token, 'nueva-clave');

      expect(await auth.authenticate(old.token)).toBeNull(); // sesión anterior cerrada
      expect((await auth.authenticate(fresh.token)).id).toBe(user.id);
      await expectCode(auth.login({ username: 'ana', password: 'vieja-clave' }), USER_ERROR.INVALID_CREDENTIALS);
      await expect(auth.login({ username: 'ana', password: 'nueva-clave' })).resolves.toBeTruthy();
    });

    it('rechaza usuario repetido, rol inexistente y cuentas deshabilitadas', async () => {
      await auth.createAccount(input, 'admin-1');
      await expectCode(auth.createAccount({ ...input, username: 'LUIS' }, 'admin-1'), USER_ERROR.USERNAME_TAKEN);
      await expectCode(
        auth.createAccount({ ...input, username: 'otro', role: 'dueño' }, 'admin-1'),
        USER_ERROR.INVALID_ROLE,
      );

      const { user } = await auth.createAccount({ name: 'Pedro Soto', username: 'pedro' }, 'admin-1');
      await auth.setAccess(user.id, { active: false });
      await expectCode(auth.createInvitation(user.id, 'admin-1'), USER_ERROR.ACCOUNT_DISABLED);
      await expectCode(auth.createInvitation('no-existe', 'admin-1'), USER_ERROR.USER_NOT_FOUND);
    });

    it('si la cuenta se deshabilita antes de usar el enlace, no se puede crear la contraseña', async () => {
      const { user, invitation } = await auth.createAccount(input, 'admin-1');
      await auth.setAccess(user.id, { active: false });

      await expectCode(auth.acceptInvitation(invitation.token, 'clave-segura'), USER_ERROR.ACCOUNT_DISABLED);
    });

    it('la cuenta puede quedar sin acceso todavía y se asigna después', async () => {
      const { user, invitation } = await auth.createAccount({ name: 'Rosa Vega', username: 'rosa' }, 'admin-1');
      expect(user.role).toBeNull();

      const { user: signedIn } = await auth.acceptInvitation(invitation.token, 'clave-segura');
      expect(signedIn.role).toBeNull();
      expect((await auth.setAccess(user.id, { role: ROLES.CASHIER })).role).toBe(ROLES.CASHIER);
    });
  });

  it('nunca deja al sistema sin administrador activo, ni con cambios simultáneos', async () => {
    await auth.ensureAdmin({ username: 'admin1', password: 'clave-segura' });
    const second = await signUp({ ...ana, username: 'admin2' });
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
