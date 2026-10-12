import { ROLES } from '@/domain/users';

/**
 * Cuentas de ejemplo SOLO para desarrollo y pruebas (modo en memoria y
 * servidor local sin base de datos). La contraseña va en texto plano porque
 * nunca debe usarse fuera de desarrollo.
 *
 * `pendiente` simula una cuenta recién registrada a la que el administrador
 * todavía no le asignó rol.
 */
export const usersSeed = [
  {
    id: 'user-cajero',
    username: 'cajero',
    name: 'Cajero demo',
    role: ROLES.CASHIER,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    password: 'cajero123',
  },
  {
    id: 'user-cocinero',
    username: 'cocinero',
    name: 'Cocinero demo',
    role: ROLES.COOK,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    password: 'cocinero123',
  },
  {
    id: 'user-admin',
    username: 'admin',
    name: 'Administrador demo',
    role: ROLES.ADMIN,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    password: 'admin123',
  },
  {
    id: 'user-pendiente',
    username: 'pendiente',
    name: 'Cuenta pendiente',
    role: null,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    password: 'pendiente123',
  },
];
