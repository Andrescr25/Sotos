/**
 * Consultas puras sobre un Menu. Alimentan el flujo del cajero:
 * Categorías -> Productos -> Extras.
 */

const bySortOrder = (a, b) => a.sortOrder - b.sortOrder;

/** @param {import('./types').Menu} menu */
export function getActiveCategories(menu) {
  return menu.categories.filter((category) => category.active).sort(bySortOrder);
}

/**
 * Categorías que el cajero debe ver: activas y con al menos un producto activo
 * (una categoría vacía solo estorba al tomar pedidos).
 * @param {import('./types').Menu} menu
 */
export function getSellableCategories(menu) {
  return getActiveCategories(menu).filter((category) =>
    menu.products.some((product) => product.active && product.categoryId === category.id),
  );
}

/**
 * @param {import('./types').Menu} menu
 * @param {string} categoryId
 */
export function getProductsByCategory(menu, categoryId) {
  return menu.products
    .filter((product) => product.active && product.categoryId === categoryId)
    .sort(bySortOrder);
}

/**
 * Extras activos que se pueden agregar al producto.
 * @param {import('./types').Menu} menu
 * @param {import('./types').Product} product
 */
export function getExtrasForProduct(menu, product) {
  return product.extraIds
    .map((extraId) => menu.extras.find((extra) => extra.id === extraId))
    .filter((extra) => extra && extra.active);
}

/**
 * @param {import('./types').Menu} menu
 * @param {string} productId
 */
export function findProduct(menu, productId) {
  return menu.products.find((product) => product.id === productId) ?? null;
}
