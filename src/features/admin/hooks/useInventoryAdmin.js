import { useCallback, useState } from 'react';
import { useInventory } from '@/features/inventory/useInventory';
import { inventoryService as defaultInventoryService } from '@/services';

/**
 * Inventario + acciones del administrador. Cada acción devuelve `{ ok, error? }`
 * y deja el último error en `actionError` para mostrarlo en pantalla.
 *
 * @param {{ service?: ReturnType<typeof import('@/services/inventoryService').createInventoryService> }} [options]
 */
export function useInventoryAdmin({ service = defaultInventoryService } = {}) {
  const { inventory, loading, error: loadError, reload } = useInventory({ service });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState(null);

  const run = useCallback(
    async (action) => {
      setBusy(true);
      setActionError(null);
      try {
        const result = await action();
        await reload();
        return { ok: true, result };
      } catch (error) {
        setActionError(error);
        return { ok: false, error };
      } finally {
        setBusy(false);
      }
    },
    [reload],
  );

  return {
    inventory,
    loading,
    loadError,
    busy,
    actionError,
    clearError: () => setActionError(null),
    reload,

    createItem: (input) => run(() => service.createItem(input)),
    updateItem: (id, patch) => run(() => service.updateItem(id, patch)),
    deleteItem: (id) => run(() => service.deleteItem(id)),
    adjustStock: (id, adjustment) => run(() => service.adjustStock(id, adjustment)),
    setRecipe: (kind, targetId, lines) => run(() => service.setRecipe(kind, targetId, lines)),
  };
}
