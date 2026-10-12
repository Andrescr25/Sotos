import { menuSeed } from '@/data/seed/menu';
import {
  MENU_COLLECTION_HANDLERS,
  addQuickNote,
  loadSampleMenu,
  moveItem,
  removeQuickNote,
} from '@/domain/menu';
import { PERMISSIONS } from '@/domain/users';
import { createId } from '@/shared/utils/createId';
import { HttpError, readJson } from './httpUtils';
import { requirePermission } from './permissions';

const COLLECTION_PATTERN = '(categories|products|extras)';

/**
 * Menú: cualquiera con acceso a Caja lo lee; solo el administrador lo edita.
 * Cada cambio se valida con las funciones puras del dominio dentro de una
 * operación atómica, y después se avisa en vivo a Caja y Administración.
 *
 * @param {Object} deps
 * @param {import('../store/contracts').MenuStore} deps.menuStore
 * @param {ReturnType<import('../realtime/createRealtimeHub').createRealtimeHub>} deps.hub
 */
export function createMenuRoutes({ menuStore, hub }) {
  async function bodyOrEmpty(req) {
    const body = await readJson(req);
    if (body !== null && (typeof body !== 'object' || Array.isArray(body))) {
      throw new HttpError(400, 'bad_json', 'El cuerpo debe ser un objeto');
    }
    return body ?? {};
  }

  /** Aplica un cambio, avisa y devuelve el menú resultante. */
  async function change(user, apply, extraBody = {}) {
    requirePermission(user, PERMISSIONS.MENU_MANAGE);
    const menu = await menuStore.updateMenu(apply);
    hub.broadcastMenuChanged();
    return { status: 200, body: { menu, ...extraBody } };
  }

  return [
    {
      method: 'GET',
      pattern: /^\/menu$/,
      async handler({ user }) {
        requirePermission(user, PERMISSIONS.MENU_VIEW);
        return { status: 200, body: { menu: await menuStore.getMenu() } };
      },
    },

    {
      method: 'POST',
      pattern: new RegExp(`^/menu/${COLLECTION_PATTERN}$`),
      async handler({ req, params, user }) {
        const { idPrefix, create } = MENU_COLLECTION_HANDLERS[params[0]];
        const input = await bodyOrEmpty(req);
        const id = createId(idPrefix);
        return change(user, (menu) => create(menu, input, { id }), { id });
      },
    },

    {
      method: 'PATCH',
      pattern: new RegExp(`^/menu/${COLLECTION_PATTERN}/([^/]+)$`),
      async handler({ req, params, user }) {
        const { update } = MENU_COLLECTION_HANDLERS[params[0]];
        const patch = await bodyOrEmpty(req);
        return change(user, (menu) => update(menu, params[1], patch));
      },
    },

    {
      method: 'DELETE',
      pattern: new RegExp(`^/menu/${COLLECTION_PATTERN}/([^/]+)$`),
      async handler({ params, user }) {
        const { remove } = MENU_COLLECTION_HANDLERS[params[0]];
        return change(user, (menu) => remove(menu, params[1]));
      },
    },

    {
      method: 'POST',
      pattern: new RegExp(`^/menu/${COLLECTION_PATTERN}/([^/]+)/move$`),
      async handler({ req, params, user }) {
        const { direction } = await bodyOrEmpty(req);
        return change(user, (menu) => moveItem(menu, params[0], params[1], direction));
      },
    },

    {
      method: 'POST',
      pattern: /^\/menu\/quick-notes$/,
      async handler({ req, user }) {
        const { text } = await bodyOrEmpty(req);
        return change(user, (menu) => addQuickNote(menu, text));
      },
    },

    {
      method: 'DELETE',
      pattern: /^\/menu\/quick-notes$/,
      async handler({ url, user }) {
        const text = url.searchParams.get('text') ?? '';
        return change(user, (menu) => removeQuickNote(menu, text));
      },
    },

    {
      method: 'POST',
      pattern: /^\/menu\/sample$/,
      async handler({ user }) {
        return change(user, (menu) => loadSampleMenu(menu, menuSeed));
      },
    },
  ];
}
