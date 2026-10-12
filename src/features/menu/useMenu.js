import { useCallback, useEffect, useState } from 'react';
import { menuService as defaultMenuService } from '@/services';

/**
 * El menú (categorías, productos, extras y observaciones frecuentes), siempre
 * al día: se recarga solo cuando el administrador lo cambia (en este u otro
 * dispositivo) y cuando la conexión se restablece.
 *
 * @param {{ service?: ReturnType<typeof import('@/services/menuService').createMenuService> }} [options]
 */
export function useMenu({ service = defaultMenuService } = {}) {
  const [state, setState] = useState({ menu: null, loading: true, error: null });

  const load = useCallback(async () => {
    try {
      const menu = await service.getMenu();
      setState({ menu, loading: false, error: null });
    } catch (error) {
      // Si ya había un menú se conserva en pantalla; solo se avisa del error.
      setState((previous) => ({ menu: previous.menu, loading: false, error }));
    }
  }, [service]);

  useEffect(() => {
    load();
    return service.subscribe((event) => {
      if (event.type === 'menu:changed' || (event.type === 'connection' && event.connected)) {
        load();
      }
    });
  }, [load, service]);

  return { ...state, reload: load };
}
