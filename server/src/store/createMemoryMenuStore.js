import { emptyMenu, normalizeMenu } from '@/domain/menu';

/**
 * Almacén del menú en memoria (desarrollo y pruebas). Mismo contrato que
 * createPostgresMenuStore.
 *
 * @param {import('@/domain/menu/types').Menu} [initial]  menú inicial (p. ej. el de ejemplo)
 * @returns {import('./contracts').MenuStore}
 */
export function createMemoryMenuStore(initial) {
  let menu = normalizeMenu(initial ?? emptyMenu());

  return {
    async init() {},

    async getMenu() {
      return menu;
    },

    // Sin `await` entre leer y escribir: atómico en un solo hilo.
    async updateMenu(apply) {
      menu = normalizeMenu(apply(menu));
      return menu;
    },

    async close() {},
  };
}
