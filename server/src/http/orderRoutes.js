import { checkOrderActor, checkOrderWrite } from '@/domain/orders';
import { PERMISSIONS } from '@/domain/users';
import { getBusinessDay } from '@/shared/utils/time';
import { HttpError, readJson, statusForCode } from './httpUtils';
import { requirePermission } from './permissions';

/**
 * Rutas de pedidos. Todas exigen sesión. Cada una es { method, pattern, handler }.
 * `handler` recibe { req, url, params, user } y devuelve { status, body }.
 *
 * @param {Object} deps
 * @param {import('../store/contracts').OrderStore} deps.orderStore
 * @param {ReturnType<import('../realtime/createRealtimeHub').createRealtimeHub>} deps.hub
 * @param {string} deps.timeZone
 * @param {() => Date} deps.now
 */
export function createOrderRoutes({ orderStore, hub, timeZone, now }) {
  return [
    {
      method: 'GET',
      pattern: /^\/orders$/,
      async handler({ url, user }) {
        requirePermission(user, PERMISSIONS.ORDER_VIEW);
        const statuses = url.searchParams.get('statuses');
        const createdById = url.searchParams.get('createdById');
        const orders = await orderStore.listOrders({
          statuses: statuses ? statuses.split(',').filter(Boolean) : undefined,
          createdById: createdById || undefined,
        });
        return { status: 200, body: { orders } };
      },
    },

    {
      method: 'POST',
      pattern: /^\/orders\/next-number$/,
      async handler({ user }) {
        requirePermission(user, PERMISSIONS.ORDER_SEND);
        const number = await orderStore.nextOrderNumber(getBusinessDay(now(), timeZone));
        return { status: 200, body: { number } };
      },
    },

    {
      method: 'GET',
      pattern: /^\/orders\/([^/]+)$/,
      async handler({ params, user }) {
        requirePermission(user, PERMISSIONS.ORDER_VIEW);
        const order = await orderStore.getOrder(params[0]);
        if (!order) throw new HttpError(404, 'order_not_found', 'El pedido no existe');
        return { status: 200, body: { order } };
      },
    },

    {
      method: 'PUT',
      pattern: /^\/orders\/([^/]+)$/,
      async handler({ req, params, user }) {
        const order = await readJson(req);
        if (!order || order.id !== params[0]) {
          throw new HttpError(400, 'invalid_order', 'El id del pedido no coincide con la ruta');
        }

        // Las reglas se evalúan contra lo guardado, dentro de la misma
        // operación atómica que la escritura. Primero la forma y el flujo
        // del pedido; después quién lo hace y con qué rol.
        const result = await orderStore.saveOrder(order, (existing) => {
          const integrity = checkOrderWrite(existing, order);
          return integrity.ok ? checkOrderActor(existing, order, user) : integrity;
        });
        if (!result.ok) {
          throw new HttpError(statusForCode(result.code), result.code, result.message);
        }

        hub.broadcastOrder(result.order);
        return { status: 200, body: { order: result.order } };
      },
    },
  ];
}
