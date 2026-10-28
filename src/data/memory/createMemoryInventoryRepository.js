import {
  INVENTORY_ERROR,
  InventoryError,
  adjustStock,
  consumeOrder,
  createItem,
  deleteItem,
  emptyInventory,
  normalizeInventory,
  setRecipe,
  updateItem,
} from '@/domain/inventory';
import { PERMISSIONS, can } from '@/domain/users';
import { createEventEmitter } from '@/shared/utils/createEventEmitter';
import { createId } from '@/shared/utils/createId';

/**
 * Inventario en memoria, para desarrollar sin servidor. Aplica las mismas reglas
 * del dominio y los mismos permisos que el servidor (si se da `getActor`). Empieza
 * vacío: el administrador crea los insumos.
 *
 * @param {Object} [options]
 * @param {import('@/domain/inventory').Inventory} [options.initial]
 * @param {() => import('@/domain/users/roles').User | null} [options.getActor]
 * @returns {import('@/data/contracts').InventoryRepository & { consumeOrder: (order: object) => void }}
 */
export function createMemoryInventoryRepository({ initial, getActor } = {}) {
  let inventory = normalizeInventory(initial ?? emptyInventory());
  const events = createEventEmitter();

  function requireManager() {
    if (!getActor) return;
    const actor = getActor();
    if (!actor) throw new InventoryError(INVENTORY_ERROR.UNAUTHORIZED, 'Inicia sesión para continuar');
    if (!can(actor.role, PERMISSIONS.INVENTORY_MANAGE)) {
      throw new InventoryError(INVENTORY_ERROR.FORBIDDEN, 'Tu rol no tiene permiso para realizar esta acción');
    }
  }

  /** Aplica un cambio; si el dominio lo rechaza, el inventario no cambia. */
  function change(apply) {
    requireManager();
    inventory = normalizeInventory(apply(inventory));
    events.emit({ type: 'inventory:changed' });
    return inventory;
  }

  return {
    async getInventory() {
      requireManager();
      return inventory;
    },

    async createItem(input) {
      const id = createId('inv');
      return { inventory: change((current) => createItem(current, input, { id })), id };
    },

    async updateItem(id, patch) {
      return change((current) => updateItem(current, id, patch));
    },

    async deleteItem(id) {
      return change((current) => deleteItem(current, id));
    },

    async adjustStock(id, adjustment) {
      return change((current) => adjustStock(current, id, adjustment));
    },

    async setRecipe(kind, targetId, lines) {
      return change((current) => setRecipe(current, kind, targetId, lines));
    },

    subscribe(listener) {
      return events.subscribe(listener);
    },

    /**
     * Solo modo en memoria: el repositorio de pedidos lo llama al guardar un
     * pedido nuevo. En el servidor lo hace el almacén dentro de la misma
     * operación que guarda el pedido.
     */
    consumeOrder(order) {
      const next = consumeOrder(inventory, order);
      if (next === inventory) return;
      inventory = next;
      events.emit({ type: 'inventory:changed' });
    },
  };
}
