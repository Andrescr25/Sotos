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

  it('el registro crea una cuenta sin rol que el admin luego habilita', async () => {
    const { authRepository, userRepository } = setup();

    const created = await authRepository.register({
      name: 'Nueva Persona',
      username: 'nueva',
      password: 'secreta1',
    });
    expect(created.role).toBeNull();
    await expect(userRepository.list()).rejects.toMatchObject({ code: USER_ERROR.FORBIDDEN });

    await authRepository.logout();
    await authRepository.login({ username: 'admin', password: 'admin123' });
    const updated = await userRepository.setAccess(created.id, { role: ROLES.COOK });

    expect(updated.role).toBe(ROLES.COOK);
    expect((await userRepository.list()).find((user) => user.id === created.id).role).toBe(ROLES.COOK);
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
});
