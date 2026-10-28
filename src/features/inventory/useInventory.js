import { useCallback, useEffect, useState } from 'react';
import { inventoryService as defaultInventoryService } from '@/services';

/**
 * El inventario (insumos, stock y recetas), siempre al día: se recarga solo
 * cuando cambia (por el administrador o por una venta, en este u otro
 * dispositivo) y cuando la conexión se restablece.
 *
 * @param {{ service?: ReturnType<typeof import('@/services/inventoryService').createInventoryService> }} [options]
 */
export function useInventory({ service = defaultInventoryService } = {}) {
  const [state, setState] = useState({ inventory: null, loading: true, error: null });

  const load = useCallback(async () => {
    try {
      const inventory = await service.getInventory();
      setState({ inventory, loading: false, error: null });
    } catch (error) {
      // Si ya había datos se conservan en pantalla; solo se avisa del error.
      setState((previous) => ({ inventory: previous.inventory, loading: false, error }));
    }
  }, [service]);

  useEffect(() => {
    load();
    return service.subscribe((event) => {
      if (event.type === 'inventory:changed' || (event.type === 'connection' && event.connected)) {
        load();
      }
    });
  }, [load, service]);

  return { ...state, reload: load };
}
