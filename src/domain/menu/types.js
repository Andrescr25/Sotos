/**
 * Precios: siempre colones enteros (sin decimales).
 */

/**
 * @typedef {Object} Category
 * @property {string} id
 * @property {string} name
 * @property {string | null} icon  nombre de icono para la UI (opcional)
 * @property {number} sortOrder
 * @property {boolean} active
 */

/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} categoryId
 * @property {string} name
 * @property {'dish' | 'drink'} kind
 * @property {number} price
 * @property {string[]} extraIds  extras que se pueden agregar a este producto
 * @property {number} sortOrder
 * @property {boolean} active
 */

/**
 * @typedef {Object} Extra
 * @property {string} id
 * @property {string} name
 * @property {number} price
 * @property {number} sortOrder
 * @property {boolean} active
 */

/**
 * @typedef {Object} Menu
 * @property {Category[]} categories
 * @property {Product[]} products
 * @property {Extra[]} extras
 * @property {string[]} quickNotes  observaciones frecuentes para agregar con un toque
 */

export {};
