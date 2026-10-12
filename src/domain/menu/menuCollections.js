import {
  createCategory,
  createExtra,
  createProduct,
  deleteCategory,
  deleteExtra,
  deleteProduct,
  updateCategory,
  updateExtra,
  updateProduct,
} from './menuAdmin';

/**
 * Qué funciones del dominio atiende cada lista del menú. Una sola tabla que
 * usan el servidor y el modo en memoria, para que ambos apliquen lo mismo.
 */
export const MENU_COLLECTION_HANDLERS = Object.freeze({
  categories: { idPrefix: 'cat', create: createCategory, update: updateCategory, remove: deleteCategory },
  products: { idPrefix: 'prod', create: createProduct, update: updateProduct, remove: deleteProduct },
  extras: { idPrefix: 'extra', create: createExtra, update: updateExtra, remove: deleteExtra },
});
