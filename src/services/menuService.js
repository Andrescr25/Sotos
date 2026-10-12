/**
 * Casos de uso del menú. Hoy solo lectura (el menú es de ejemplo); la
 * administración de productos llegará con la zona de administración.
 *
 * @param {{ menuRepository: import('@/data/contracts').MenuRepository }} deps
 */
export function createMenuService({ menuRepository }) {
  return {
    /** @returns {Promise<import('@/domain/menu/types').Menu>} */
    getMenu: () => menuRepository.getMenu(),
  };
}
