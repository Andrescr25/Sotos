export const ROLES = Object.freeze({
  CASHIER: 'cashier',
  COOK: 'cook',
  ADMIN: 'admin',
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.CASHIER]: 'Cajero',
  [ROLES.COOK]: 'Cocinero',
  [ROLES.ADMIN]: 'Administrador',
});

/** Roles que el administrador puede asignar, en el orden en que se muestran. */
export const ASSIGNABLE_ROLES = Object.freeze([ROLES.CASHIER, ROLES.COOK, ROLES.ADMIN]);

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isRole(value) {
  return ASSIGNABLE_ROLES.includes(value);
}

/**
 * El usuario no elige su rol: se registra o inicia sesión y el administrador
 * le asigna el acceso. Mientras `role` sea null la cuenta no tiene acceso a
 * ninguna pantalla de trabajo.
 *
 * @typedef {Object} User
 * @property {string} id
 * @property {string} username  usuario con el que inicia sesión (minúsculas)
 * @property {string} name  nombre para mostrar
 * @property {'cashier' | 'cook' | 'admin' | null} role  null = sin acceso asignado todavía
 * @property {boolean} active  false = cuenta deshabilitada, no puede entrar
 * @property {boolean} passwordSet  false = invitada: todavía no creó su contraseña
 * @property {string} createdAt  fecha ISO
 */
