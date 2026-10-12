import { OrderError, checkOrderWrite } from '@/domain/orders';
import { createEventEmitter } from '@/shared/utils/createEventEmitter';
import { getBusinessDay } from '@/shared/utils/time';

/**
 * Repositorio de pedidos en memoria. Sirve para desarrollar y probar sin
 * backend. Limitación: solo comunica pantallas dentro del MISMO dispositivo;
 * para caja y cocina en tablets distintas se usa el adaptador remoto.
 *
 * Aplica las mismas reglas de guardado que el servidor (`checkOrderWrite`).
 *
 * @param {{ now?: () => Date }} [options]
 * @returns {import('@/data/contracts').OrderRepository}
 */
export function createMemoryOrderRepository({ now = () => new Date() } = {}) {
  /** @type {Map<string, import('@/domain/orders/order').Order>} */
  const orders = new Map();
  const events = createEventEmitter();
  const counters = new Map();

  return {
    async save(order) {
      const verdict = checkOrderWrite(orders.get(order.id) ?? null, order);
      if (!verdict.ok) throw new OrderError(verdict.code, verdict.message);

      orders.set(order.id, order);
      events.emit({ type: 'order:saved', order });
      return order;
    },

    async getById(id) {
      return orders.get(id) ?? null;
    },

    async list({ statuses, createdById } = {}) {
      return [...orders.values()]
        .filter((order) => !statuses || statuses.includes(order.status))
        .filter((order) => !createdById || order.createdBy.id === createdById)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },

    async nextOrderNumber() {
      const key = getBusinessDay(now());
      const next = (counters.get(key) ?? 0) + 1;
      counters.set(key, next);
      return next;
    },

    subscribe(listener) {
      return events.subscribe(listener);
    },
  };
}
