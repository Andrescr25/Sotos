/**
 * Almacén en memoria con el mismo contrato que el de Postgres. Sirve para
 * desarrollo local sin base de datos y para pruebas. Los datos se pierden al
 * reiniciar el proceso: nunca usarlo en producción.
 *
 * @returns {import('./contracts').OrderStore}
 */
export function createMemoryStore() {
  const orders = new Map();
  const counters = new Map();

  return {
    async init() {},

    async getOrder(id) {
      return orders.get(id) ?? null;
    },

    async listOrders({ statuses, createdById } = {}) {
      return [...orders.values()]
        .filter((order) => !statuses || statuses.includes(order.status))
        .filter((order) => !createdById || order.createdBy.id === createdById)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    },

    // Node es de un solo hilo y no hay `await` entre leer y escribir: es atómico.
    async saveOrder(order, check) {
      const verdict = check(orders.get(order.id) ?? null);
      if (!verdict.ok) return verdict;
      orders.set(order.id, order);
      return { ok: true, order };
    },

    async nextOrderNumber(day) {
      const next = (counters.get(day) ?? 0) + 1;
      counters.set(day, next);
      return next;
    },

    async close() {},
  };
}
