import { menuSeed } from '@/data/seed/menu';
import { usersSeed } from '@/data/seed/users';
import { INVENTORY_ERROR, RECIPE_KIND } from '@/domain/inventory';
import { findProduct } from '@/domain/menu';
import {
  ORDER_STATUS,
  addItem,
  changeOrderStatus,
  createDraftOrder,
  createOrderItem,
  sendOrderToKitchen,
  setCustomerName,
} from '@/domain/orders';
import { PAYMENT_METHOD } from '@/domain/payments';
import { createMemoryInventoryRepository } from './createMemoryInventoryRepository';
import { createMemoryOrderRepository } from './createMemoryOrderRepository';

const [cashier, cook, admin] = usersSeed;

function setup() {
  const session = { user: admin };
  const inventory = createMemoryInventoryRepository({ getActor: () => session.user });
  // Los pedidos se guardan sin verificar la sesión: aquí se prueba el inventario.
  const orders = createMemoryOrderRepository({ onOrderCreated: inventory.consumeOrder });

  async function sell(quantity = 1) {
    const draft = addItem(
      setCustomerName(createDraftOrder({ createdBy: cashier }), 'María Pérez'),
      createOrderItem({ product: findProduct(menuSeed, 'prod-papas'), quantity }),
    );
    const number = await orders.nextOrderNumber();
    return orders.save(sendOrderToKitchen(draft, { number, user: cashier, payment: { method: PAYMENT_METHOD.CARD } }));
  }

  async function withPapas() {
    const { id } = await inventory.createItem({ name: 'Papas', unit: 'paquete', portionsPerUnit: 8, stock: 24 });
    await inventory.setRecipe(RECIPE_KIND.PRODUCTS, 'prod-papas', [{ itemId: id, portions: 1 }]);
    return id;
  }

  const stockOf = async (id) => (await inventory.getInventory()).items.find((item) => item.id === id).stock;

  return { inventory, orders, session, sell, withPapas, stockOf };
}

describe('inventario en memoria', () => {
  it('empieza vacío y el administrador crea insumos y recetas con las reglas del dominio', async () => {
    const { inventory, withPapas } = setup();
    expect((await inventory.getInventory()).items).toEqual([]);

    const id = await withPapas();

    const current = await inventory.getInventory();
    expect(current.items[0]).toMatchObject({ id, name: 'Papas', stock: 24 });
    expect(current.recipes.products['prod-papas']).toEqual([{ itemId: id, portions: 1 }]);
    await expect(inventory.createItem({ name: 'papas', unit: 'kg', portionsPerUnit: 1 })).rejects.toMatchObject({
      code: INVENTORY_ERROR.DUPLICATE_NAME,
    });
  });

  it('cada pedido nuevo descuenta una vez, y avanzar el pedido por cocina no vuelve a descontar', async () => {
    const { orders, sell, withPapas, stockOf } = setup();
    const id = await withPapas();

    const sent = await sell(3);
    expect(await stockOf(id)).toBe(21);

    await orders.save(changeOrderStatus(sent, ORDER_STATUS.IN_PROGRESS, { user: cook }));
    expect(await stockOf(id)).toBe(21);

    await sell(1);
    expect(await stockOf(id)).toBe(20);
  });

  it('avisa a las pantallas abiertas cuando cambia el stock', async () => {
    const { inventory, sell, withPapas } = setup();
    await withPapas();
    const listener = jest.fn();
    inventory.subscribe(listener);

    await sell(1);

    expect(listener).toHaveBeenCalledWith({ type: 'inventory:changed' });
  });

  it('un pedido sin recetas no cambia el stock ni avisa', async () => {
    const { inventory, orders } = setup();
    await inventory.createItem({ name: 'Salsa', unit: 'botella', portionsPerUnit: 20, stock: 20 });
    const listener = jest.fn();
    inventory.subscribe(listener);

    const draft = addItem(
      setCustomerName(createDraftOrder({ createdBy: cashier }), 'María Pérez'),
      createOrderItem({ product: findProduct(menuSeed, 'prod-coca-cola') }),
    );
    await orders.save(sendOrderToKitchen(draft, { number: 1, user: cashier, payment: { method: PAYMENT_METHOD.CARD } }));

    expect(listener).not.toHaveBeenCalled();
    expect((await inventory.getInventory()).items[0].stock).toBe(20);
  });

  it('solo el administrador ve y edita el inventario', async () => {
    const { inventory, session, withPapas } = setup();
    const id = await withPapas();

    for (const user of [cashier, cook, null]) {
      session.user = user;
      const code = user ? 'forbidden' : 'unauthorized';
      await expect(inventory.getInventory()).rejects.toMatchObject({ code });
      await expect(inventory.createItem({ name: 'Sal', unit: 'kg', portionsPerUnit: 1 })).rejects.toMatchObject({ code });
      await expect(inventory.adjustStock(id, { mode: 'set', portions: 1 })).rejects.toMatchObject({ code });
      await expect(inventory.deleteItem(id)).rejects.toMatchObject({ code });
    }
  });
});
