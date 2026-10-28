/**
 * Casos de uso del inventario (solo administrador; el servidor lo verifica en
 * cada llamada). Todo se cuenta en porciones enteras: un paquete que rinde 8
 * porciones y un platillo que usa 1/8 de él es "1 porción".
 *
 * El descuento por ventas no se pide desde aquí: ocurre solo, en el servidor,
 * al guardar cada pedido nuevo.
 *
 * @param {{ inventoryRepository: import('@/data/contracts').InventoryRepository }} deps
 */
export function createInventoryService({ inventoryRepository }) {
  return {
    /** @returns {Promise<import('@/domain/inventory').Inventory>} */
    getInventory: () => inventoryRepository.getInventory(),

    // Insumos
    createItem: (input) => inventoryRepository.createItem(input),
    updateItem: (id, patch) => inventoryRepository.updateItem(id, patch),
    /** También lo quita de las recetas que lo usaban. */
    deleteItem: (id) => inventoryRepository.deleteItem(id),

    /**
     * Entró mercadería, hubo merma o se hizo un conteo.
     * @param {string} id
     * @param {{ mode: 'add' | 'set', portions: number }} adjustment
     */
    adjustStock: (id, adjustment) => inventoryRepository.adjustStock(id, adjustment),

    /**
     * Define lo que gasta una unidad vendida de un producto o extra. Sin líneas, quita la receta.
     * @param {'products' | 'extras'} kind
     * @param {string} targetId  id del producto o del extra en el menú
     * @param {{ itemId: string, portions: number }[]} lines
     */
    setRecipe: (kind, targetId, lines) => inventoryRepository.setRecipe(kind, targetId, lines),

    /**
     * Avisa cuando el inventario cambia (por el administrador o por una venta).
     * @param {(event: object) => void} listener
     * @returns {() => void}
     */
    subscribe: (listener) => inventoryRepository.subscribe(listener),
  };
}
