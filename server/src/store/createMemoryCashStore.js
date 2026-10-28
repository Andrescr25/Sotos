import { isPaidOrder } from '@/domain/cashClosing';

/**
 * Almacén de cierres de caja en memoria, con el mismo contrato que el de
 * Postgres. Lee los pedidos del almacén de pedidos en memoria. Los datos se
 * pierden al reiniciar: solo para desarrollo y pruebas.
 *
 * @param {Object} deps
 * @param {import('./contracts').OrderStore} deps.orderStore
 * @returns {import('./contracts').CashStore}
 */
export function createMemoryCashStore({ orderStore }) {
  /** @type {import('@/domain/cashClosing').CashClosing[]} */
  const closings = [];
  /** Pedidos ya cubiertos por algún cierre. */
  const covered = new Set();
  // Los cierres se encolan para que dos a la vez se apliquen uno tras otro.
  let queue = Promise.resolve();

  async function readPending() {
    const orders = (await orderStore.listOrders()).filter(
      (order) => isPaidOrder(order) && !covered.has(order.id),
    );
    return { orders, previous: closings.at(-1) ?? null };
  }

  return {
    async init() {},

    getPending: readPending,

    createClosing(id, build) {
      const run = async () => {
        const existing = closings.find((closing) => closing.id === id);
        if (existing) return existing;

        const { orders, previous } = await readPending();
        const closing = build({ orders, previous });
        closings.push(closing);
        orders.forEach((order) => covered.add(order.id));
        return closing;
      };
      const result = queue.then(run);
      queue = result.catch(() => {});
      return result;
    },

    async listClosings({ limit = 30 } = {}) {
      return [...closings].reverse().slice(0, limit);
    },

    async close() {},
  };
}
