import {
  KITCHEN_STATUSES,
  ORDER_ERROR,
  ORDER_STATUS,
  OrderError,
  changeOrderStatus,
  sendOrderToKitchen,
} from '@/domain/orders';

/**
 * Casos de uso de pedidos: combinan reglas de dominio con el repositorio.
 * Las pantallas llaman a estas funciones; no tocan el repositorio directamente.
 *
 * @param {Object} deps
 * @param {import('@/data/contracts').OrderRepository} deps.orderRepository
 * @param {() => Date} [deps.now]
 */
export function createOrderService({ orderRepository, now = () => new Date() }) {
  async function requireOrder(orderId) {
    const order = await orderRepository.getById(orderId);
    if (!order) {
      throw new OrderError(ORDER_ERROR.ORDER_NOT_FOUND, 'El pedido no existe');
    }
    return order;
  }

  async function transition(orderId, nextStatus, user) {
    // Se lee el estado actual del repositorio, no de la pantalla: si otro
    // dispositivo ya cambió el pedido, la transición inválida se rechaza.
    const order = await requireOrder(orderId);
    const updated = changeOrderStatus(order, nextStatus, { user, now: now() });
    return orderRepository.save(updated);
  }

  return {
    /**
     * Cajero: cobra el pedido y lo envía a cocina. Cocina lo recibe vía
     * `subscribe`. Sin un pago confirmado el pedido no sale.
     * @param {import('@/domain/orders/order').Order} draft
     * @param {import('@/domain/users/roles').User} user
     * @param {{ method: string, tendered?: number }} payment  forma de pago y, en efectivo, lo que entregó el cliente
     */
    async sendToKitchen(draft, user, payment) {
      // Reintento seguro: si el servidor guardó el pedido pero la respuesta se
      // perdió (WiFi inestable), reenviar devuelve el pedido ya guardado en
      // lugar de duplicarlo o fallar.
      const stored = await orderRepository.getById(draft.id);
      if (stored && stored.status !== ORDER_STATUS.DRAFT) return stored;

      // Se valida con un número provisional antes de pedir el consecutivo: un
      // pago o un pedido inválido no debe gastar un número de pedido.
      sendOrderToKitchen(draft, { number: 1, user, payment, now: now() });

      const number = await orderRepository.nextOrderNumber();
      const sent = sendOrderToKitchen(draft, { number, user, payment, now: now() });
      return orderRepository.save(sent);
    },

    /** Cocina: NEW -> IN_PROGRESS */
    startPreparation: (orderId, user) => transition(orderId, ORDER_STATUS.IN_PROGRESS, user),

    /** Cocina: IN_PROGRESS -> READY */
    markReady: (orderId, user) => transition(orderId, ORDER_STATUS.READY, user),

    /** Caja: READY -> DELIVERED */
    markDelivered: (orderId, user) => transition(orderId, ORDER_STATUS.DELIVERED, user),

    /** Caja/Admin: cancela mientras el pedido no esté en un estado final */
    cancel: (orderId, user) => transition(orderId, ORDER_STATUS.CANCELLED, user),

    /** Pedidos que cocina debe mostrar (Nuevo, En preparación, Listo). */
    listKitchenOrders: () => orderRepository.list({ statuses: [...KITCHEN_STATUSES] }),

    /** Pedidos en alguno de los estados dados, del más antiguo al más nuevo. */
    listByStatus: (statuses) => orderRepository.list({ statuses: [...statuses] }),

    /**
     * Avisa cada vez que un pedido se guarda o cambia de estado.
     * @param {(event: import('@/data/contracts').OrderEvent) => void} listener
     * @returns {() => void} cancelar suscripción
     */
    subscribe: (listener) => orderRepository.subscribe(listener),
  };
}
