import { PGlite } from '@electric-sql/pglite';
import { menuSeed } from '@/data/seed/menu';
import { usersSeed } from '@/data/seed/users';
import { CASH_CLOSING_ERROR, CashClosingError, createCashClosing } from '@/domain/cashClosing';
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
import { createMemoryCashStore } from './createMemoryCashStore';
import { createMemoryStore } from './createMemoryStore';
import { createPostgresCashStore } from './createPostgresCashStore';
import { createPostgresStore } from './createPostgresStore';

const [cashier, cook] = usersSeed;
const T0 = new Date('2026-10-12T18:00:00.000Z');
const at = (minutes) => new Date(T0.getTime() + minutes * 60_000);

/** Pedido de ₡1.500 (papas) ya cobrado. */
function paidOrder(number, payment = { method: PAYMENT_METHOD.CARD }, minute = number) {
  const draft = addItem(
    setCustomerName(createDraftOrder({ createdBy: cashier, now: at(minute) }), 'María Pérez', at(minute)),
    createOrderItem({ product: findProduct(menuSeed, 'prod-papas'), quantity: 1 }),
    at(minute),
  );
  return sendOrderToKitchen(draft, { number, user: cashier, payment, now: at(minute) });
}

/** Un pedido de una versión anterior: sin pago. */
const legacyOrder = (number) => {
  const { payment, ...rest } = paidOrder(number);
  return rest;
};

function pgliteDb() {
  const pglite = new PGlite();
  return {
    query: (text, params) => pglite.query(text, params),
    transaction: (fn) => pglite.transaction((tx) => fn(tx)),
    close: () => pglite.close(),
  };
}

async function createMemoryHarness() {
  const orderStore = createMemoryStore();
  return { orderStore, cashStore: createMemoryCashStore({ orderStore }) };
}

async function createPostgresHarness() {
  const db = pgliteDb();
  const orderStore = createPostgresStore(db);
  const cashStore = createPostgresCashStore(db);
  await orderStore.init();
  await cashStore.init();
  return { orderStore, cashStore };
}

// El mismo contrato debe cumplirse con memoria y con Postgres.
describe.each([
  ['memoria', createMemoryHarness],
  ['Postgres', createPostgresHarness],
])('CashStore (%s)', (_name, createHarness) => {
  let orderStore;
  let cashStore;

  beforeEach(async () => {
    ({ orderStore, cashStore } = await createHarness());
  });

  afterEach(async () => {
    await cashStore.close();
    if (_name === 'memoria') await orderStore.close();
  });

  const save = (order) => orderStore.saveOrder(order, (existing) => checkOrderWrite(existing, order));

  /** Cierra con los datos que pida la prueba, con las mismas reglas del servidor. */
  const close = (id, { openingFloat = 0, countedCash = 0, now = at(100) } = {}) =>
    cashStore.createClosing(id, ({ orders, previous }) =>
      createCashClosing({ id, orders, previous, openingFloat, countedCash, user: cashier, now }),
    );

  it('sin pedidos cobrados no hay nada pendiente', async () => {
    expect(await cashStore.getPending()).toEqual({ orders: [], previous: null });
  });

  it('lo pendiente son los pedidos con cobro, y se ignoran los que no lo tienen', async () => {
    await save(paidOrder(1));
    await save(paidOrder(2));
    // Un pedido viejo sin pago entra directo al almacén (el servidor ya no lo aceptaría).
    await orderStore.saveOrder(legacyOrder(3), () => ({ ok: true }));

    const { orders, previous } = await cashStore.getPending();

    expect(orders.map((order) => order.number)).toEqual([1, 2]);
    expect(previous).toBeNull();
  });

  it('un cierre cubre los pedidos pendientes y deja el siguiente cierre en cero', async () => {
    await save(paidOrder(1));
    await save(paidOrder(2, { method: PAYMENT_METHOD.CASH, tendered: 5_000 }));

    const closing = await close('cls_1', { openingFloat: 10_000, countedCash: 11_500 });

    expect(closing).toMatchObject({
      id: 'cls_1',
      number: 1,
      sales: { orderCount: 2, total: 3_000 },
      cash: { cashSales: 1_500, expected: 11_500, counted: 11_500, difference: 0 },
    });
    const { orders, previous } = await cashStore.getPending();
    expect(orders).toEqual([]);
    expect(previous).toMatchObject({ id: 'cls_1', number: 1 });
  });

  it('un pedido cobrado después del cierre entra en el siguiente, no en el anterior', async () => {
    await save(paidOrder(1));
    await close('cls_1');
    await save(paidOrder(2));

    const second = await close('cls_2', { now: at(200) });

    expect(second).toMatchObject({ number: 2, sales: { orderCount: 1 } });
    expect(second.periodStart).toBe(at(100).toISOString());
  });

  it('un pedido que avanza por cocina después de cobrarse no cambia de cierre', async () => {
    const order = paidOrder(1);
    await save(order);
    await close('cls_1');

    await save(changeOrderStatus(order, ORDER_STATUS.IN_PROGRESS, { user: cook, now: at(120) }));

    expect((await cashStore.getPending()).orders).toEqual([]);
  });

  it('sin pedidos por cerrar rechaza el cierre y no guarda nada', async () => {
    await expect(close('cls_1')).rejects.toBeInstanceOf(CashClosingError);
    await expect(close('cls_1')).rejects.toMatchObject({ code: CASH_CLOSING_ERROR.NO_SALES });
    expect(await cashStore.listClosings()).toEqual([]);
  });

  it('si las reglas rechazan el cierre, los pedidos quedan pendientes', async () => {
    await save(paidOrder(1));

    await expect(close('cls_1', { countedCash: -1 })).rejects.toMatchObject({
      code: CASH_CLOSING_ERROR.INVALID_AMOUNT,
    });

    expect((await cashStore.getPending()).orders).toHaveLength(1);
    expect(await cashStore.listClosings()).toEqual([]);
  });

  it('reintentar con el mismo id devuelve el cierre ya guardado sin duplicarlo', async () => {
    await save(paidOrder(1));
    const first = await close('cls_1', { countedCash: 1_500 });
    await save(paidOrder(2));

    const retry = await close('cls_1', { countedCash: 99_999 });

    expect(retry).toEqual(first);
    expect(await cashStore.listClosings()).toHaveLength(1);
    expect((await cashStore.getPending()).orders).toHaveLength(1); // el pedido 2 sigue pendiente
  });

  it('con dos cierres simultáneos solo uno cubre los pedidos', async () => {
    await save(paidOrder(1));
    await save(paidOrder(2));

    const results = await Promise.allSettled([close('cls_a'), close('cls_b')]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected.reason).toMatchObject({ code: CASH_CLOSING_ERROR.NO_SALES });
    const closings = await cashStore.listClosings();
    expect(closings).toHaveLength(1);
    expect(closings[0].sales.orderCount).toBe(2);
  });

  it('lista los cierres del más reciente al más antiguo y respeta el límite', async () => {
    for (const number of [1, 2, 3]) {
      await save(paidOrder(number));
      await close(`cls_${number}`, { now: at(100 + number * 10) });
    }

    expect((await cashStore.listClosings()).map((closing) => closing.number)).toEqual([3, 2, 1]);
    expect((await cashStore.listClosings({ limit: 2 })).map((closing) => closing.number)).toEqual([3, 2]);
  });

  it('guarda y devuelve el cierre idéntico, sin depender del orden de las claves', async () => {
    await save(paidOrder(1));
    const created = await close('cls_1', { countedCash: 1_500 });

    const [stored] = await cashStore.listClosings();

    expect(stored).toEqual(created);
  });
});
