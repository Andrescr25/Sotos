import { useCallback, useEffect, useState } from 'react';
import { ORDER_STATUS, getStatusTime } from '@/domain/orders';
import { orderService as defaultOrderService } from '@/services';

const sentTime = (order) => getStatusTime(order, ORDER_STATUS.NEW) ?? order.createdAt;
const byArrival = (a, b) => sentTime(a).localeCompare(sentTime(b)) || a.id.localeCompare(b.id);

/**
 * Pedidos en ciertos estados, siempre al día: carga la lista, aplica cada
 * cambio que llega en tiempo real y la recarga entera si la conexión se
 * restablece (pudo perder eventos).
 *
 * @param {Object} options
 * @param {string[]} options.statuses  estados a mostrar (debe ser un arreglo estable o constante)
 * @param {ReturnType<typeof import('@/services/orderService').createOrderService>} [options.service]
 */
export function useLiveOrders({ statuses, service = defaultOrderService }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(true);

  const statusKey = statuses.join(',');

  const load = useCallback(async () => {
    try {
      const list = await service.listByStatus(statusKey.split(','));
      setOrders([...list].sort(byArrival));
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [service, statusKey]);

  useEffect(() => {
    const wanted = statusKey.split(',');
    load();

    return service.subscribe((event) => {
      if (event.type === 'order:saved') {
        setOrders((previous) => {
          const others = previous.filter((order) => order.id !== event.order.id);
          return wanted.includes(event.order.status)
            ? [...others, event.order].sort(byArrival)
            : others;
        });
      } else if (event.type === 'connection') {
        setConnected(event.connected);
        if (event.connected) load();
      }
    });
  }, [service, statusKey, load]);

  return { orders, loading, error, connected, reload: load };
}
