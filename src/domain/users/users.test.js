import { usersSeed } from '@/data/seed/users';
import {
  AREAS,
  PERMISSIONS,
  ROLES,
  USER_ERROR,
  applyAccessChange,
  can,
  canAccessArea,
  getHomeArea,
  hasAccess,
  normalizeUsername,
  validateRegistration,
} from '@/domain/users';

const [cashier, cook, admin, pending] = usersSeed;
const publicUsers = usersSeed.map(({ password, ...user }) => user);

function expectUserError(fn, code) {
  try {
    fn();
  } catch (error) {
    expect(error.code).toBe(code);
    return;
  }
  throw new Error(`Se esperaba UserError ${code}`);
}

describe('permisos y acceso por rol', () => {
  it('una cuenta sin rol no puede hacer nada', () => {
    expect(can(null, PERMISSIONS.ORDER_VIEW)).toBe(false);
    expect(hasAccess(pending)).toBe(false);
    expect(getHomeArea(pending)).toBeNull();
    Object.values(AREAS).forEach((area) => expect(canAccessArea(pending, area)).toBe(false));
  });

  it('cada rol entra a su zona y el administrador a todas', () => {
    expect(getHomeArea(cashier)).toBe(AREAS.CASHIER);
    expect(getHomeArea(cook)).toBe(AREAS.KITCHEN);
    expect(getHomeArea(admin)).toBe(AREAS.ADMIN);

    expect(canAccessArea(cashier, AREAS.KITCHEN)).toBe(false);
    expect(canAccessArea(cook, AREAS.CASHIER)).toBe(false);
    expect(canAccessArea(cook, AREAS.ADMIN)).toBe(false);
    Object.values(AREAS).forEach((area) => expect(canAccessArea(admin, area)).toBe(true));
  });

  it('una cuenta deshabilitada pierde todo el acceso aunque conserve el rol', () => {
    const disabled = { ...cashier, active: false };
    expect(hasAccess(disabled)).toBe(false);
    expect(canAccessArea(disabled, AREAS.CASHIER)).toBe(false);
  });

  it('solo el administrador gestiona usuarios', () => {
    expect(can(ROLES.ADMIN, PERMISSIONS.USER_MANAGE)).toBe(true);
    expect(can(ROLES.CASHIER, PERMISSIONS.USER_MANAGE)).toBe(false);
    expect(can(ROLES.COOK, PERMISSIONS.USER_MANAGE)).toBe(false);
  });
});

describe('validateRegistration', () => {
  it('limpia nombre y usuario', () => {
    expect(
      validateRegistration({ name: '  María   Pérez ', username: ' MPerez ', password: 'secreta1' }),
    ).toEqual({ name: 'María Pérez', username: 'mperez', password: 'secreta1' });
  });

  it('rechaza datos inválidos con el código correspondiente', () => {
    const ok = { name: 'Ana', username: 'ana', password: 'secreta1' };
    expectUserError(() => validateRegistration({ ...ok, name: 'A' }), USER_ERROR.INVALID_NAME);
    expectUserError(() => validateRegistration({ ...ok, username: 'a b' }), USER_ERROR.INVALID_USERNAME);
    expectUserError(() => validateRegistration({ ...ok, username: 'ab' }), USER_ERROR.INVALID_USERNAME);
    expectUserError(() => validateRegistration({ ...ok, password: '12345' }), USER_ERROR.INVALID_PASSWORD);
    expectUserError(() => validateRegistration(null), USER_ERROR.INVALID_NAME);
  });

  it('normalizeUsername pasa a minúsculas y recorta', () => {
    expect(normalizeUsername('  Cajero1 ')).toBe('cajero1');
  });
});

describe('applyAccessChange', () => {
  it('el administrador asigna un rol a una cuenta pendiente', () => {
    const updated = applyAccessChange(publicUsers, pending.id, { role: ROLES.COOK });
    expect(updated).toMatchObject({ id: pending.id, role: ROLES.COOK, active: true });
  });

  it('permite quitar el acceso con role null', () => {
    expect(applyAccessChange(publicUsers, cashier.id, { role: null }).role).toBeNull();
  });

  it('rechaza roles que no existen y usuarios inexistentes', () => {
    expectUserError(() => applyAccessChange(publicUsers, cashier.id, { role: 'dueño' }), USER_ERROR.INVALID_ROLE);
    expectUserError(() => applyAccessChange(publicUsers, 'nadie', { role: ROLES.COOK }), USER_ERROR.USER_NOT_FOUND);
  });

  it('no deja al sistema sin administrador activo', () => {
    expectUserError(() => applyAccessChange(publicUsers, admin.id, { role: ROLES.COOK }), USER_ERROR.LAST_ADMIN);
    expectUserError(() => applyAccessChange(publicUsers, admin.id, { active: false }), USER_ERROR.LAST_ADMIN);
    expectUserError(() => applyAccessChange(publicUsers, admin.id, { role: null }), USER_ERROR.LAST_ADMIN);
  });

  it('con otro administrador activo sí se puede cambiar al primero', () => {
    const withSecondAdmin = [...publicUsers, { ...cook, id: 'u2', username: 'otro', role: ROLES.ADMIN }];
    expect(applyAccessChange(withSecondAdmin, admin.id, { role: ROLES.CASHIER }).role).toBe(ROLES.CASHIER);
  });
});
