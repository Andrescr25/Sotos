import { ORDER_ERROR } from '@/domain/orders';

/**
 * Repositorio de pedidos que habla con el servidor. Cumple el contrato
 * `OrderRepository`; la app no sabe si hay red de por medio.
 *
 * @param {Object} deps
 * @param {ReturnType<import('./createHttpClient').createHttpClient>} deps.http
 * @param {ReturnType<import('./createRealtimeClient').createRealtimeClient>} deps.realtime
 * @returns {import('@/data/contracts').OrderRepository}
 */
export function createRemoteOrderRepository({ http, realtime }) {
  return {
    async save(order) {
      const payload = await http.put(`/orders/${encodeURIComponent(order.id)}`, order);
      return payload.order;
    },

    async getById(id) {
      try {
        const payload = await http.get(`/orders/${encodeURIComponent(id)}`);
        return payload.order;
      } catch (error) {
        if (error.code === ORDER_ERROR.ORDER_NOT_FOUND) return null;
        throw error;
      }
    },

    async list({ statuses, createdById } = {}) {
      const params = new URLSearchParams();
      if (statuses?.length) params.set('statuses', statuses.join(','));
      if (createdById) params.set('createdById', createdById);
      const query = params.toString();
      const payload = await http.get(`/orders${query ? `?${query}` : ''}`);
      return payload.orders;
    },

    async nextOrderNumber() {
      const payload = await http.post('/orders/next-number');
      return payload.number;
    },

    subscribe(listener) {
      return realtime.subscribe((event) => {
        if (event.type === 'order:saved' || event.type === 'connection') listener(event);
      });
    },
  };
}
