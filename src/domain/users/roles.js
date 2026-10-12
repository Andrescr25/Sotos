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

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} name
 * @property {'cashier' | 'cook' | 'admin'} role
 */
