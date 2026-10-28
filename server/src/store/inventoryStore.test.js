import { PGlite } from '@electric-sql/pglite';
import { menuSeed } from '@/data/seed/menu';
import { usersSeed } from '@/data/seed/users';
import {
  INVENTORY_ERROR,
  InventoryError,
  RECIPE_KIND,
  adjustStock,
  createItem,
  setRecipe,
} from '@/domain/inventory';
import { findProduct } from '@/domain/menu';
import {
  ORDER_STATUS,
  addItem,
  changeOrderStatus,
  checkOrderWrite,
  createDraftOrder,
  createOrderItem,
  sendOrderToKitchen,
  setCustomerName,
} from '@/domain/orders';
import { PAYMENT_METHOD } from '@/domain/payments';
import { createMemoryInventoryStore } from './createMemoryInventoryStore';
import { createMemoryStore } from './createMemoryStore';
import { createPostgresInventoryStore } from './createPostgresInventoryStore';
import { createPostgresStore } from './createPostgresStore';

const [cashier, cook] = usersSeed;
const T0 = new Date('2026-10-12T18:00:00.000Z');

/** Pedido de `quantity` papas (₡1.500 c/u), ya cobrado y enviado. */
function sentOrder(number = 1, quantity = 1) {
  const draft = addItem(
    setCustomerName(createDraftOrder({ createdBy: cashier, now: T0 }), 'María Pérez', T0),
    createOrderItem({ product: findProduct(menuSeed, 'prod-papas'), quantity }),
    T0,
  );
  return sendOrderToKitchen(draft, { number, user: cashier, payment: { method: PAYMENT_METHOD.CARD }, now: T0 });
}

/** 3 paquetes de papas (8 porciones c/u); "Papas" usa 1 porción. */
const setUp = (inventory) =>
  setRecipe(
    createItem(inventory, { name: 'Paquete de papas', unit: 'paquete', portionsPerUnit: 8, stock: 24 }, { id: 'papas' }),
    RECIPE_KIND.PRODUCTS,
    'prod-papas',
    [{ itemId: 'papas', portions: 1 }],
  );

const stockOf = async (store) => (await store.getInventory()).items.find((item) => item.id === 'papas')?.stock;

function pgliteDb() {
  const pglite = new PGlite();
  return {
    query: (text, params) => pglite.query(text, params),
    transaction: (fn) => pglite.transaction((tx) => fn(tx)),
    close: () => pglite.close(),
  };
}

async function createMemoryHarness() {
  return { orderStore: createMemoryStore(), inventoryStore: createMemoryInventoryStore() };
}

async function createPostgresHarness() {
  const db = pgliteDb();
  const orderStore = createPostgresStore(db);
  const inventoryStore = createPostgresInventoryStore(db);
  await orderStore.init();
  await inventoryStore.init();
  return { orderStore, inventoryStore };
}

// El mismo contrato debe cumplirse con memoria y con Postgres.
describe.each([
  ['memoria', createMemoryHarness],
  ['Postgres', createPostgresHarness],
])('InventoryStore (%s)', (name, createHarness) => {
  let orderStore;
  let inventoryStore;

  beforeEach(async () => {
    ({ orderStore, inventoryStore } = await createHarness());
  });

  afterEach(async () => {
    await inventoryStore.close();
    if (name === 'memoria') await orderStore.close();
  });

  /** Guarda el pedido como lo hace el servidor: el descuento va con la creación. */
  const sell = (order) =>
    orderStore.saveOrder(
      order,
      (existing) => checkOrderWrite(existing, order),
      (tx) => inventoryStore.consumeForOrder(order, tx),
    );

  it('empieza vacío', async () => {
    expect(await inventoryStore.getInventory()).toEqual({ items: [], recipes: { products: {}, extras: {} } });
  });

  it('aplica un cambio y lo conserva idéntico', async () => {
    const saved = await inventoryStore.updateInventory(setUp);

    expect(saved.items).toHaveLength(1);
    expect(await inventoryStore.getInventory()).toEqual(saved);
  });

  it('si las reglas rechazan el cambio, no se guarda nada', async () => {
    await inventoryStore.updateInventory(setUp);

    await expect(
      inventoryStore.updateInventory((inventory) =>
        createItem(inventory, { name: 'Paquete de papas', unit: 'paquete', portionsPerUnit: 8 }),
      ),
    ).rejects.toMatchObject({ code: INVENTORY_ERROR.DUPLICATE_NAME });

    expect((await inventoryStore.getInventory()).items).toHaveLength(1);
  });

  it('varios cambios a la vez se aplican uno tras otro sin perderse', async () => {
    await inventoryStore.updateInventory(setUp);

    await Promise.all(
      Array.from({ length: 5 }, () =>
        inventoryStore.updateInventory((inventory) => adjustStock(inventory, 'papas', { mode: 'add', portions: 2 })),
      ),
    );

    expect(await stockOf(inventoryStore)).toBe(24 + 10);
  });

  it('una venta descuenta 1/8 del paquete en la misma operación que guarda el pedido', async () => {
    await inventoryStore.updateInventory(setUp);

    const result = await sell(sentOrder(1, 1));

    expect(result.ok).toBe(true);
    expect(await stockOf(inventoryStore)).toBe(23);
    expect(await orderStore.getOrder(result.order.id)).toEqual(result.order);
  });

  it('descuenta por la cantidad de cada línea y acumula varias ventas', async () => {
    await inventoryStore.updateInventory(setUp);

    await sell(sentOrder(1, 3));
    await sell(sentOrder(2, 2));

    expect(await stockOf(inventoryStore)).toBe(24 - 5);
  });

  it('las ventas simultáneas descuentan todas', async () => {
    await inventoryStore.updateInventory(setUp);

    await Promise.all(Array.from({ length: 6 }, (_, index) => sell(sentOrder(index + 1, 1))));

    expect(await stockOf(inventoryStore)).toBe(24 - 6);
  });

  it('nunca bloquea una venta: el stock puede quedar negativo', async () => {
    await inventoryStore.updateInventory((inventory) =>
      adjustStock(setUp(inventory), 'papas', { mode: 'set', portions: 1 }),
    );

    const result = await sell(sentOrder(1, 4));

    expect(result.ok).toBe(true);
    expect(await stockOf(inventoryStore)).toBe(-3);
  });

  it('un cambio de estado del pedido no vuelve a descontar', async () => {
    await inventoryStore.updateInventory(setUp);
    const order = sentOrder(1, 2);
    await sell(order);

    await sell(changeOrderStatus(order, ORDER_STATUS.IN_PROGRESS, { user: cook, now: T0 }));

    expect(await stockOf(inventoryStore)).toBe(22);
  });

  it('un pedido rechazado no descuenta', async () => {
    await inventoryStore.updateInventory(setUp);

    const result = await sell({ ...sentOrder(1, 1), customerName: '' });

    expect(result.ok).toBe(false);
    expect(await stockOf(inventoryStore)).toBe(24);
  });

  it('el mismo pedido enviado dos veces a la vez descuenta una sola vez', async () => {
    await inventoryStore.updateInventory(setUp);
    const order = sentOrder(1, 1);

    await Promise.all([sell(order), sell(order)]);

    expect(await stockOf(inventoryStore)).toBe(23);
  });

  it('un pedido sin recetas, o sin inventario configurado, no cambia nada', async () => {
    expect(await inventoryStore.consumeForOrder(sentOrder())).toBe(false); // sin inventario

    await inventoryStore.updateInventory((inventory) =>
      createItem(inventory, { name: 'Salsa', unit: 'botella', portionsPerUnit: 20, stock: 20 }, { id: 'salsa' }),
    );
    expect(await inventoryStore.consumeForOrder(sentOrder())).toBe(false); // sin recetas
    expect((await inventoryStore.getInventory()).items[0].stock).toBe(20);
  });

  it('consumeForOrder avisa si cambió el stock', async () => {
    await inventoryStore.updateInventory(setUp);
    expect(await inventoryStore.consumeForOrder(sentOrder(1, 1))).toBe(true);
  });
});

describe('InventoryStore (Postgres): el pedido y el descuento son una sola operación', () => {
  it('si el descuento falla, el pedido tampoco se guarda y el stock queda igual', async () => {
    const { orderStore, inventoryStore } = await createPostgresHarness();
    await inventoryStore.updateInventory(setUp);
    const order = sentOrder(1, 2);

    await expect(
      orderStore.saveOrder(
        order,
        (existing) => checkOrderWrite(existing, order),
        async (tx) => {
          await inventoryStore.consumeForOrder(order, tx); // el descuento sí corre…
          throw new InventoryError(INVENTORY_ERROR.INVALID_AMOUNT, 'falla después de descontar');
        },
      ),
    ).rejects.toThrow('falla después de descontar');

    // …pero todo se revierte junto.
    expect(await orderStore.getOrder(order.id)).toBeNull();
    expect(await stockOf(inventoryStore)).toBe(24);
    await inventoryStore.close();
  });
});
