/**
 * Casos de uso del menú. Leer lo puede hacer Caja; agregar, editar, ordenar y
 * eliminar platillos, bebidas, extras y categorías solo el administrador (el
 * servidor lo verifica en cada llamada).
 *
 * Los pedidos ya tomados guardan su propia copia de nombre y precio: cambiar
 * el menú no altera pedidos existentes.
 *
 * @param {{ menuRepository: import('@/data/contracts').MenuRepository }} deps
 */
export function createMenuService({ menuRepository }) {
  return {
    /** @returns {Promise<import('@/domain/menu/types').Menu>} */
    getMenu: () => menuRepository.getMenu(),

    // Categorías
    createCategory: (input) => menuRepository.create('categories', input),
    updateCategory: (id, patch) => menuRepository.update('categories', id, patch),
    /** Solo si no tiene productos; si los tiene, se oculta con `active: false`. */
    deleteCategory: (id) => menuRepository.remove('categories', id),
    moveCategory: (id, direction) => menuRepository.move('categories', id, direction),

    // Productos: platillos y bebidas
    createProduct: (input) => menuRepository.create('products', input),
    updateProduct: (id, patch) => menuRepository.update('products', id, patch),
    deleteProduct: (id) => menuRepository.remove('products', id),
    moveProduct: (id, direction) => menuRepository.move('products', id, direction),

    // Extras
    createExtra: (input) => menuRepository.create('extras', input),
    updateExtra: (id, patch) => menuRepository.update('extras', id, patch),
    /** También lo quita de los productos que lo ofrecían. */
    deleteExtra: (id) => menuRepository.remove('extras', id),
    moveExtra: (id, direction) => menuRepository.move('extras', id, direction),

    // Observaciones frecuentes
    addQuickNote: (text) => menuRepository.addQuickNote(text),
    removeQuickNote: (text) => menuRepository.removeQuickNote(text),

    /** Carga el menú de ejemplo (solo con el menú vacío). */
    loadSampleMenu: () => menuRepository.loadSample(),

    /**
     * Avisa cuando el menú cambia, para recargarlo.
     * @param {(event: object) => void} listener
     * @returns {() => void}
     */
    subscribe: (listener) => menuRepository.subscribe(listener),
  };
}
