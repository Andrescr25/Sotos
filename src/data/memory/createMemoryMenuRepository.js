import { menuSeed } from '@/data/seed/menu';
import {
  MENU_COLLECTION_HANDLERS,
  MENU_ERROR,
  MenuError,
  addQuickNote,
  loadSampleMenu,
  moveItem,
  normalizeMenu,
  removeQuickNote,
} from '@/domain/menu';
import { PERMISSIONS, can } from '@/domain/users';
import { createEventEmitter } from '@/shared/utils/createEventEmitter';
import { createId } from '@/shared/utils/createId';

/**
 * Menú en memoria, para desarrollar sin servidor. Aplica las mismas reglas
 * del dominio y los mismos permisos que el servidor (si se da `getActor`).
 *
 * @param {Object} [options]
 * @param {import('@/domain/menu/types').Menu} [options.initial]  menú inicial (por defecto, el de ejemplo)
 * @param {() => import('@/domain/users/roles').User | null} [options.getActor]
 * @returns {import('@/data/contracts').MenuRepository}
 */
export function createMemoryMenuRepository({ initial = menuSeed, getActor } = {}) {
  let menu = normalizeMenu(JSON.parse(JSON.stringify(initial)));
  const events = createEventEmitter();

  function requirePermission(permission) {
    if (!getActor) return;
    const actor = getActor();
    if (!actor) throw new MenuError(MENU_ERROR.UNAUTHORIZED, 'Inicia sesión para continuar');
    if (!can(actor.role, permission)) {
      throw new MenuError(MENU_ERROR.FORBIDDEN, 'Tu rol no tiene permiso para realizar esta acción');
    }
  }

  /** Aplica un cambio; si el dominio lo rechaza, el menú no cambia. */
  function change(apply) {
    requirePermission(PERMISSIONS.MENU_MANAGE);
    menu = normalizeMenu(apply(menu));
    events.emit({ type: 'menu:changed' });
    return menu;
  }

  return {
    async getMenu() {
      requirePermission(PERMISSIONS.MENU_VIEW);
      return menu;
    },

    async create(collection, input) {
      const { idPrefix, create } = MENU_COLLECTION_HANDLERS[collection];
      const id = createId(idPrefix);
      return { menu: change((current) => create(current, input, { id })), id };
    },

    async update(collection, id, patch) {
      const { update } = MENU_COLLECTION_HANDLERS[collection];
      return change((current) => update(current, id, patch));
    },

    async remove(collection, id) {
      const { remove } = MENU_COLLECTION_HANDLERS[collection];
      return change((current) => remove(current, id));
    },

    async move(collection, id, direction) {
      return change((current) => moveItem(current, collection, id, direction));
    },

    async addQuickNote(text) {
      return change((current) => addQuickNote(current, text));
    },

    async removeQuickNote(text) {
      return change((current) => removeQuickNote(current, text));
    },

    async loadSample() {
      return change((current) => loadSampleMenu(current, menuSeed));
    },

    subscribe(listener) {
      return events.subscribe(listener);
    },
  };
}
