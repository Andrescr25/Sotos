import { useCallback, useState } from 'react';
import { useMenu } from '@/features/menu/useMenu';
import { menuService as defaultMenuService } from '@/services';

/**
 * Menú + acciones del administrador. Cada acción devuelve `{ ok, error? }` y
 * deja el último error en `actionError` para mostrarlo en pantalla.
 *
 * @param {{ service?: ReturnType<typeof import('@/services/menuService').createMenuService> }} [options]
 */
export function useMenuAdmin({ service = defaultMenuService } = {}) {
  const { menu, loading, error: loadError, reload } = useMenu({ service });
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
    menu,
    loading,
    loadError,
    busy,
    actionError,
    clearError: () => setActionError(null),
    reload,

    createCategory: (input) => run(() => service.createCategory(input)),
    updateCategory: (id, patch) => run(() => service.updateCategory(id, patch)),
    deleteCategory: (id) => run(() => service.deleteCategory(id)),
    moveCategory: (id, direction) => run(() => service.moveCategory(id, direction)),

    createProduct: (input) => run(() => service.createProduct(input)),
    updateProduct: (id, patch) => run(() => service.updateProduct(id, patch)),
    deleteProduct: (id) => run(() => service.deleteProduct(id)),
    moveProduct: (id, direction) => run(() => service.moveProduct(id, direction)),

    createExtra: (input) => run(() => service.createExtra(input)),
    updateExtra: (id, patch) => run(() => service.updateExtra(id, patch)),
    deleteExtra: (id) => run(() => service.deleteExtra(id)),
    moveExtra: (id, direction) => run(() => service.moveExtra(id, direction)),

    addQuickNote: (text) => run(() => service.addQuickNote(text)),
    removeQuickNote: (text) => run(() => service.removeQuickNote(text)),
    loadSampleMenu: () => run(() => service.loadSampleMenu()),
  };
}
