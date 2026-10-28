import { MENU_ERROR, MenuError } from '@/domain/menu';
import {
  RECIPE_KIND,
  adjustStock,
  createItem,
  deleteItem,
  setRecipe,
  updateItem,
} from '@/domain/inventory';
import { PERMISSIONS } from '@/domain/users';
import { createId } from '@/shared/utils/createId';
import { HttpError, readJson } from './httpUtils';
import { requirePermission } from './permissions';

const KIND_PATTERN = `(${Object.values(RECIPE_KIND).join('|')})`;

/**
 * Inventario: solo el administrador lo ve y lo edita. Cada cambio se valida con
 * las funciones puras del dominio dentro de una operación atómica y después se
 * avisa en vivo a las pantallas de administración abiertas.
 *
 * El descuento por ventas no pasa por aquí: lo hace el almacén de pedidos al
 * guardar un pedido nuevo (ver `orderRoutes`).
 *
 * @param {Object} deps
 * @param {import('../store/contracts').InventoryStore} deps.inventoryStore
 * @param {import('../store/contracts').MenuStore} deps.menuStore
 * @param {ReturnType<import('../realtime/createRealtimeHub').createRealtimeHub>} deps.hub
 */
export function createInventoryRoutes({ inventoryStore, menuStore, hub }) {
  async function bodyOrEmpty(req) {
    const body = await readJson(req);
    if (body !== null && (typeof body !== 'object' || Array.isArray(body))) {
      throw new HttpError(400, 'bad_json', 'El cuerpo debe ser un objeto');
    }
    return body ?? {};
  }

  /** Aplica un cambio, avisa y devuelve el inventario resultante. */
  async function change(user, apply, extraBody = {}) {
    requirePermission(user, PERMISSIONS.INVENTORY_MANAGE);
    const inventory = await inventoryStore.updateInventory(apply);
    hub.broadcastInventoryChanged();
    return { status: 200, body: { inventory, ...extraBody } };
  }

  /** La receta solo puede apuntar a algo que exista en el menú. */
  async function assertMenuTarget(kind, targetId) {
    const menu = await menuStore.getMenu();
    if (kind === RECIPE_KIND.PRODUCTS && !menu.products.some((product) => product.id === targetId)) {
      throw new MenuError(MENU_ERROR.PRODUCT_NOT_FOUND, 'El producto no existe');
    }
    if (kind === RECIPE_KIND.EXTRAS && !menu.extras.some((extra) => extra.id === targetId)) {
      throw new MenuError(MENU_ERROR.EXTRA_NOT_FOUND, 'El extra no existe');
    }
  }

  return [
    {
      method: 'GET',
      pattern: /^\/inventory$/,
      async handler({ user }) {
        requirePermission(user, PERMISSIONS.INVENTORY_MANAGE);
        return { status: 200, body: { inventory: await inventoryStore.getInventory() } };
      },
    },

    {
      method: 'POST',
      pattern: /^\/inventory\/items$/,
      async handler({ req, user }) {
        const input = await bodyOrEmpty(req);
        const id = createId('inv');
        return change(user, (inventory) => createItem(inventory, input, { id }), { id });
      },
    },

    {
      method: 'PATCH',
      pattern: /^\/inventory\/items\/([^/]+)$/,
      async handler({ req, params, user }) {
        const patch = await bodyOrEmpty(req);
        return change(user, (inventory) => updateItem(inventory, params[0], patch));
      },
    },

    {
      method: 'DELETE',
      pattern: /^\/inventory\/items\/([^/]+)$/,
      async handler({ params, user }) {
        return change(user, (inventory) => deleteItem(inventory, params[0]));
      },
    },

    {
      method: 'POST',
      pattern: /^\/inventory\/items\/([^/]+)\/adjust$/,
      async handler({ req, params, user }) {
        const { mode, portions } = await bodyOrEmpty(req);
        return change(user, (inventory) => adjustStock(inventory, params[0], { mode, portions }));
      },
    },

    {
      method: 'PUT',
      pattern: new RegExp(`^/inventory/recipes/${KIND_PATTERN}/([^/]+)$`),
      async handler({ req, params, user }) {
        requirePermission(user, PERMISSIONS.INVENTORY_MANAGE);
        const [kind, targetId] = params;
        const { lines } = await bodyOrEmpty(req);
        // Quitar una receta se permite siempre (limpia las de productos ya borrados).
        if (Array.isArray(lines) && lines.length > 0) await assertMenuTarget(kind, targetId);
        return change(user, (inventory) => setRecipe(inventory, kind, targetId, lines));
      },
    },
  ];
}
