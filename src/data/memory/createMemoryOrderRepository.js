import { OrderError, checkOrderActor, checkOrderWrite } from '@/domain/orders';
import { createEventEmitter } from '@/shared/utils/createEventEmitter';
import { getBusinessDay } from '@/shared/utils/time';

/**
 * Repositorio de pedidos en memoria. Sirve para desarrollar y probar sin
 * backend. Limitación: solo comunica pantallas dentro del MISMO dispositivo;
 * para caja y cocina en tablets distintas se usa el adaptador remoto.
 *
 * Aplica las mismas reglas de guardado que el servidor (`checkOrderWrite`) y,
 * si se le indica quién es el usuario de la sesión, también `checkOrderActor`.
 *
 * @param {Object} [options]
 * @param {() => Date} [options.now]
 * @param {() => import('@/domain/users/roles').User | null} [options.getActor]
 * @param {(order: import('@/domain/orders/order').Order) => void} [options.onOrderCreated]
 *   se llama una vez por cada pedido nuevo (no en cambios de estado); así el
 *   modo en memoria descuenta el inventario, como lo hace el servidor
 * @returns {import('@/data/contracts').OrderRepository}
 */
export function createMemoryOrderRepository({ now = () => new Date(), getActor, onOrderCreated } = {}) {
  /** @type {Map<string, import('@/domain/orders/order').Order>} */
  const orders = new Map();
  const events = createEventEmitter();
  const counters = new Map();

  return {
    async save(order) {
      const existing = orders.get(order.id) ?? null;
      let verdict = checkOrderWrite(existing, order);
      if (verdict.ok && getActor) verdict = checkOrderActor(existing, order, getActor());
      if (!verdict.ok) throw new OrderError(verdict.code, verdict.message);

      orders.set(order.id, order);
      if (!existing) onOrderCreated?.(order);
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
