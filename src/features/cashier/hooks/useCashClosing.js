import { useCallback, useEffect, useRef, useState } from 'react';
import { cashClosingService as defaultCashClosingService, orderService as defaultOrderService } from '@/services';

/**
 * Lo que está por cerrarse y los cierres anteriores, siempre al día: carga al
 * abrir, recarga cuando otro dispositivo cobra, cancela o cierra un pedido, y
 * cuando vuelve la conexión (pudo perder eventos).
 *
 * @param {Object} [options]
 * @param {ReturnType<typeof import('@/services/cashClosingService').createCashClosingService>} [options.cashClosingService]
 * @param {ReturnType<typeof import('@/services/orderService').createOrderService>} [options.orderService]
 */
export function useCashClosing({
  cashClosingService = defaultCashClosingService,
  orderService = defaultOrderService,
} = {}) {
  const [state, setState] = useState({ pending: null, closings: [], loading: true, error: null });
  // Si llegan varias recargas seguidas, solo cuenta la última que se pidió.
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const [pending, closings] = await Promise.all([
        cashClosingService.getPending(),
        cashClosingService.listClosings(),
      ]);
      if (request === latestRequest.current) setState({ pending, closings, loading: false, error: null });
    } catch (error) {
      // Si ya había datos se conservan en pantalla; solo se avisa del error.
      if (request === latestRequest.current) setState((previous) => ({ ...previous, loading: false, error }));
    }
  }, [cashClosingService]);

  useEffect(() => {
    load();
    return orderService.subscribe((event) => {
      if (event.type === 'order:saved' || (event.type === 'connection' && event.connected)) load();
    });
  }, [orderService, load]);

  return { ...state, reload: load };
}
