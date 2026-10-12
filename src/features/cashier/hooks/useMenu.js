import { useEffect, useState } from 'react';
import { menuService as defaultMenuService } from '@/services';

/**
 * Carga el menú (categorías, productos, extras y observaciones frecuentes).
 * @param {{ service?: ReturnType<typeof import('@/services/menuService').createMenuService> }} [options]
 */
export function useMenu({ service = defaultMenuService } = {}) {
  const [state, setState] = useState({ menu: null, loading: true, error: null });

  useEffect(() => {
    let active = true;
    service
      .getMenu()
      .then((menu) => active && setState({ menu, loading: false, error: null }))
      .catch((error) => active && setState({ menu: null, loading: false, error }));
    return () => {
      active = false;
    };
  }, [service]);

  return state;
}
