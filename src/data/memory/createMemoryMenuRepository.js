import { menuSeed } from '@/data/seed/menu';

/**
 * @param {import('@/domain/menu/types').Menu} [menu]
 * @returns {import('@/data/contracts').MenuRepository}
 */
export function createMemoryMenuRepository(menu = menuSeed) {
  return {
    async getMenu() {
      return menu;
    },
  };
}
