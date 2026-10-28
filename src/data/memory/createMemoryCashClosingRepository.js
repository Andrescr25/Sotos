import { buildCashPending, createCashClosing, isPaidOrder } from '@/domain/cashClosing';
import { PERMISSIONS, can } from '@/domain/users';
import { AppError, COMMON_ERROR } from '@/shared/errors/AppError';

/**
 * Cierres de caja en memoria, para desarrollar y probar sin servidor. Aplica
 * las mismas reglas que el servidor (`createCashClosing`) sobre los pedidos del
 * repositorio de pedidos. Los datos se pierden al recargar.
 *
 * @param {Object} deps
 * @param {import('@/data/contracts').OrderRepository} deps.orderRepository
 * @param {() => import('@/domain/users/roles').User | null} [deps.getActor]  usuario de la sesión
 * @param {() => Date} [deps.now]
 * @returns {import('@/data/contracts').CashClosingRepository}
 */
export function createMemoryCashClosingRepository({ orderRepository, getActor, now = () => new Date() }) {
  /** @type {import('@/domain/cashClosing').CashClosing[]} */
  const closings = [];
  const covered = new Set();
  // Los cierres se encolan para que dos a la vez se apliquen uno tras otro.
  let queue = Promise.resolve();

  function requireActor() {
    const user = getActor?.();
    if (!user || !can(user.role, PERMISSIONS.CASH_CLOSE)) {
      throw new AppError(COMMON_ERROR.FORBIDDEN, 'Tu rol no tiene permiso para realizar esta acción');
    }
    return user;
  }

  async function readPending() {
    const orders = (await orderRepository.list()).filter(
      (order) => isPaidOrder(order) && !covered.has(order.id),
    );
    return { orders, previous: closings.at(-1) ?? null };
  }

  return {
    async getPending() {
      requireActor();
      return buildCashPending(await readPending());
    },

    close({ id, openingFloat, countedCash, note }) {
      const run = async () => {
        // Dentro de la operación: un rechazo llega como promesa rechazada, no como excepción síncrona.
        const user = requireActor();
        const existing = closings.find((closing) => closing.id === id);
        if (existing) return existing;

        const { orders, previous } = await readPending();
        const closing = createCashClosing({
          id,
          orders,
          previous,
          openingFloat,
          countedCash,
          note: note ?? '',
          user,
          now: now(),
        });
        closings.push(closing);
        orders.forEach((order) => covered.add(order.id));
        return closing;
      };
      const result = queue.then(run);
      queue = result.catch(() => {});
      return result;
    },

    async list({ limit = 30 } = {}) {
      requireActor();
      return [...closings].reverse().slice(0, limit);
    },
  };
}
