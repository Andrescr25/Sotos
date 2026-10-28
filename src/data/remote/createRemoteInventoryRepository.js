/**
 * Inventario que habla con el servidor. Cumple `InventoryRepository`.
 *
 * @param {Object} deps
 * @param {ReturnType<import('./createHttpClient').createHttpClient>} deps.http
 * @param {ReturnType<import('./createRealtimeClient').createRealtimeClient>} deps.realtime
 * @returns {import('@/data/contracts').InventoryRepository}
 */
export function createRemoteInventoryRepository({ http, realtime }) {
  const segment = (value) => encodeURIComponent(value);

  return {
    async getInventory() {
      return (await http.get('/inventory')).inventory;
    },

    async createItem(input) {
      const { inventory, id } = await http.post('/inventory/items', input);
      return { inventory, id };
    },

    async updateItem(id, patch) {
      return (await http.patch(`/inventory/items/${segment(id)}`, patch)).inventory;
    },

    async deleteItem(id) {
      return (await http.delete(`/inventory/items/${segment(id)}`)).inventory;
    },

    async adjustStock(id, adjustment) {
      return (await http.post(`/inventory/items/${segment(id)}/adjust`, adjustment)).inventory;
    },

    async setRecipe(kind, targetId, lines) {
      return (await http.put(`/inventory/recipes/${segment(kind)}/${segment(targetId)}`, { lines })).inventory;
    },

    subscribe(listener) {
      return realtime.subscribe((event) => {
        if (event.type === 'inventory:changed' || event.type === 'connection') listener(event);
      });
    },
  };
}
