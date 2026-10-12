import { ROLES } from '@/domain/users';

/**
 * Usuarios de ejemplo para desarrollo, uno por rol. La autenticación real
 * (login, PIN, etc.) llegará con el módulo de usuarios.
 * @type {import('@/domain/users/roles').User[]}
 */
export const usersSeed = [
  { id: 'user-cajero', name: 'Cajero demo', role: ROLES.CASHIER },
  { id: 'user-cocinero', name: 'Cocinero demo', role: ROLES.COOK },
  { id: 'user-admin', name: 'Administrador demo', role: ROLES.ADMIN },
];
