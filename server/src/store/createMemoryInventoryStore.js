import { consumeOrder, emptyInventory, normalizeInventory } from '@/domain/inventory';

/**
 * Almacén del inventario en memoria (desarrollo y pruebas). Mismo contrato que
 * createPostgresInventoryStore.
 *
 * @param {import('@/domain/inventory').Inventory} [initial]
 * @returns {import('./contracts').InventoryStore}
 */
export function createMemoryInventoryStore(initial) {
  let inventory = normalizeInventory(initial ?? emptyInventory());

  return {
    async init() {},

    async getInventory() {
      return inventory;
    },

    // Sin `await` entre leer y escribir: atómico en un solo hilo.
    async updateInventory(apply) {
      inventory = normalizeInventory(apply(inventory));
      return inventory;
    },

    async consumeForOrder(order) {
      const next = consumeOrder(inventory, order);
      if (next === inventory) return false;
      inventory = next;
      return true;
    },

    async close() {},
  };
}
