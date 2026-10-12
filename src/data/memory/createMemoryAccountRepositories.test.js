import { ROLES, USER_ERROR } from '@/domain/users';
import { createMemoryAccountRepositories } from './createMemoryAccountRepositories';

function setup() {
  return createMemoryAccountRepositories();
}

describe('cuentas en memoria (modo sin servidor)', () => {
  it('inicia sesión con una cuenta de ejemplo y recupera la sesión', async () => {
    const { authRepository } = setup();

    expect(await authRepository.restore()).toBeNull();
    const user = await authRepository.login({ username: 'Cajero', password: 'cajero123' });

    expect(user).toMatchObject({ username: 'cajero', role: ROLES.CASHIER });
    expect(user).not.toHaveProperty('password');
    expect(await authRepository.restore()).toEqual(user);
  });

  it('rechaza credenciales incorrectas', async () => {
    const { authRepository } = setup();
    await expect(
      authRepository.login({ username: 'cajero', password: 'mala' }),
    ).rejects.toMatchObject({ code: USER_ERROR.INVALID_CREDENTIALS });
  });

  it('no existe el registro abierto: las cuentas las crea el administrador', async () => {
    const { authRepository } = setup();
    expect(authRepository.register).toBeUndefined();
  });

  it('una cuenta invitada sin rol queda pendiente hasta que el admin la habilita', async () => {
    const { authRepository, userRepository } = setup();

    await authRepository.login({ username: 'admin', password: 'admin123' });
    const { user, invitation } = await userRepository.createAccount({
      name: 'Nueva Persona',
      username: 'nueva',
    });
    await authRepository.logout();

    const created = await authRepository.acceptInvitation(invitation.token, 'secreta1');
    expect(created.role).toBeNull();
    await expect(userRepository.list()).rejects.toMatchObject({ code: USER_ERROR.FORBIDDEN });

    await authRepository.logout();
    await authRepository.login({ username: 'admin', password: 'admin123' });
    const updated = await userRepository.setAccess(user.id, { role: ROLES.COOK });

    expect(updated.role).toBe(ROLES.COOK);
    expect((await userRepository.list()).find((u) => u.id === user.id).role).toBe(ROLES.COOK);
  });

  it('avisa a la cuenta afectada cuando cambia su rol', async () => {
    const { authRepository, userRepository } = setup();
    await authRepository.login({ username: 'admin', password: 'admin123' });
    const events = [];
    authRepository.subscribe((event) => events.push(event));

    // El admin se cambia el rol a sí mismo no es posible (último admin); se
    // verifica con una segunda cuenta administradora.
    const other = await userRepository.setAccess('user-pendiente', { role: ROLES.ADMIN });
    expect(other.role).toBe(ROLES.ADMIN);
    const self = await userRepository.setAccess('user-admin', { role: ROLES.CASHIER });

    expect(self.role).toBe(ROLES.CASHIER);
    expect(events).toContainEqual({ type: 'user:updated', user: expect.objectContaining({ role: ROLES.CASHIER }) });
  });

  it('no deja al sistema sin administrador', async () => {
    const { authRepository, userRepository } = setup();
    await authRepository.login({ username: 'admin', password: 'admin123' });

    await expect(userRepository.setAccess('user-admin', { role: null })).rejects.toMatchObject({
      code: USER_ERROR.LAST_ADMIN,
    });
  });

  describe('invitaciones', () => {
    async function inviteAsAdmin(accounts, input) {
      await accounts.authRepository.login({ username: 'admin', password: 'admin123' });
      const issued = await accounts.userRepository.createAccount(input);
      await accounts.authRepository.logout();
      return issued;
    }

    it('el admin crea la cuenta, el empleado abre el enlace y entra con su rol', async () => {
      const accounts = setup();
      const { user, invitation } = await inviteAsAdmin(accounts, {
        name: 'Luis Rojas',
        username: 'luis',
        role: ROLES.COOK,
      });
      expect(user).toMatchObject({ role: ROLES.COOK, passwordSet: false });

      expect(await accounts.authRepository.getInvitation(invitation.token)).toMatchObject({
        name: 'Luis Rojas',
        role: ROLES.COOK,
        isReset: false,
      });
      const signedIn = await accounts.authRepository.acceptInvitation(invitation.token, 'clave-segura');

      expect(signedIn).toMatchObject({ username: 'luis', role: ROLES.COOK, passwordSet: true });
      expect(accounts.getCurrentUser().id).toBe(user.id);
    });

    it('sin contraseña no se puede entrar y el enlace sirve una sola vez', async () => {
      const accounts = setup();
      const { invitation } = await inviteAsAdmin(accounts, { name: 'Luis Rojas', username: 'luis', role: ROLES.CASHIER });

      await expect(accounts.authRepository.login({ username: 'luis', password: '' })).rejects.toMatchObject({
        code: USER_ERROR.INVALID_CREDENTIALS,
      });

      await accounts.authRepository.acceptInvitation(invitation.token, 'clave-segura');
      await accounts.authRepository.logout();
      await expect(
        accounts.authRepository.acceptInvitation(invitation.token, 'otra-clave'),
      ).rejects.toMatchObject({ code: USER_ERROR.INVITATION_USED });
      await expect(accounts.authRepository.login({ username: 'luis', password: 'clave-segura' })).resolves.toBeTruthy();
    });

    it('un enlace inventado o una contraseña débil se rechazan', async () => {
      const accounts = setup();
      const { invitation } = await inviteAsAdmin(accounts, { name: 'Luis Rojas', username: 'luis', role: ROLES.COOK });

      await expect(accounts.authRepository.getInvitation('inventado')).rejects.toMatchObject({
        code: USER_ERROR.INVITATION_INVALID,
      });
      await expect(accounts.authRepository.acceptInvitation(invitation.token, '123')).rejects.toMatchObject({
        code: USER_ERROR.INVALID_PASSWORD,
      });
    });

    it('un enlace nuevo reemplaza al anterior y sirve para restablecer la contraseña', async () => {
      const accounts = setup();
      await accounts.authRepository.login({ username: 'admin', password: 'admin123' });
      const first = await accounts.userRepository.createInvitation('user-cajero');
      const second = await accounts.userRepository.createInvitation('user-cajero');
      await accounts.authRepository.logout();

      await expect(accounts.authRepository.getInvitation(first.invitation.token)).rejects.toMatchObject({
        code: USER_ERROR.INVITATION_INVALID,
      });
      expect(await accounts.authRepository.getInvitation(second.invitation.token)).toMatchObject({ isReset: true });

      await accounts.authRepository.acceptInvitation(second.invitation.token, 'nueva-clave');
      await accounts.authRepository.logout();
      await expect(accounts.authRepository.login({ username: 'cajero', password: 'cajero123' })).rejects.toBeTruthy();
      await expect(accounts.authRepository.login({ username: 'cajero', password: 'nueva-clave' })).resolves.toBeTruthy();
    });

    it('solo el administrador crea cuentas y enlaces', async () => {
      const accounts = setup();
      await accounts.authRepository.login({ username: 'cajero', password: 'cajero123' });

      await expect(
        accounts.userRepository.createAccount({ name: 'Intruso', username: 'intruso', role: ROLES.ADMIN }),
      ).rejects.toMatchObject({ code: USER_ERROR.FORBIDDEN });
      await expect(accounts.userRepository.createInvitation('user-cocinero')).rejects.toMatchObject({
        code: USER_ERROR.FORBIDDEN,
      });
    });

    it('rechaza un usuario repetido', async () => {
      const accounts = setup();
      await accounts.authRepository.login({ username: 'admin', password: 'admin123' });

      await expect(
        accounts.userRepository.createAccount({ name: 'Otro Cajero', username: 'CAJERO', role: ROLES.CASHIER }),
      ).rejects.toMatchObject({ code: USER_ERROR.USERNAME_TAKEN });
    });
  });
});
