import { checkOrderWrite } from '@/domain/orders';
import { getBusinessDay } from '@/shared/utils/time';
import { HttpError, readJson, statusForCode } from './httpUtils';

/**
 * Rutas de pedidos. Cada una es { method, pattern, handler }.
 * `handler` recibe { req, url, params } y devuelve { status, body }.
 *
 * @param {Object} deps
 * @param {import('../store/contracts').OrderStore} deps.store
 * @param {{ broadcast: (event: object) => void }} deps.hub
 * @param {string} deps.timeZone
 * @param {() => Date} deps.now
 */
export function createOrderRoutes({ store, hub, timeZone, now }) {
  return [
    {
      method: 'GET',
      pattern: /^\/orders$/,
      async handler({ url }) {
        const statuses = url.searchParams.get('statuses');
        const createdById = url.searchParams.get('createdById');
        const orders = await store.listOrders({
          statuses: statuses ? statuses.split(',').filter(Boolean) : undefined,
          createdById: createdById || undefined,
        });
        return { status: 200, body: { orders } };
      },
    },

    {
      method: 'POST',
      pattern: /^\/orders\/next-number$/,
      async handler() {
        const number = await store.nextOrderNumber(getBusinessDay(now(), timeZone));
        return { status: 200, body: { number } };
      },
    },

    {
      method: 'GET',
      pattern: /^\/orders\/([^/]+)$/,
      async handler({ params }) {
        const order = await store.getOrder(params[0]);
        if (!order) throw new HttpError(404, 'order_not_found', 'El pedido no existe');
        return { status: 200, body: { order } };
      },
    },

    {
      method: 'PUT',
      pattern: /^\/orders\/([^/]+)$/,
      async handler({ req, params }) {
        const order = await readJson(req);
        if (!order || order.id !== params[0]) {
          throw new HttpError(400, 'invalid_order', 'El id del pedido no coincide con la ruta');
        }

        const result = await store.saveOrder(order, (existing) => checkOrderWrite(existing, order));
        if (!result.ok) {
          throw new HttpError(statusForCode(result.code), result.code, result.message);
        }

        hub.broadcast({ type: 'order:saved', order: result.order });
        return { status: 200, body: { order: result.order } };
      },
    },
  ];
}
