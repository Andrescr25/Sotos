import { PGlite } from '@electric-sql/pglite';
import { menuSeed } from '@/data/seed/menu';
import { usersSeed } from '@/data/seed/users';
import { findProduct } from '@/domain/menu';
import {
  ORDER_ERROR,
  ORDER_STATUS,
  addItem,
  changeOrderStatus,
  checkOrderWrite,
  createDraftOrder,
  createOrderItem,
  sendOrderToKitchen,
} from '@/domain/orders';
import { createMemoryStore } from './createMemoryStore';
import { createPostgresStore } from './createPostgresStore';

const [cashier, cook] = usersSeed;

const T0 = new Date('2026-10-12T18:00:00.000Z');
const at = (minutes) => new Date(T0.getTime() + minutes * 60_000);

function sentOrder(number = 1, createdAt = T0) {
  const draft = addItem(
    createDraftOrder({ createdBy: cashier, now: createdAt }),
    createOrderItem({ product: findProduct(menuSeed, 'prod-papas'), quantity: 1 }),
    createdAt,
  );
  return sendOrderToKitchen(draft, { number, user: cashier, now: new Date(createdAt.getTime() + 60_000) });
}

/** PGlite = Postgres real compilado a WebAssembly; adaptado a la forma de `db`. */
async function createPgliteStore() {
  const pglite = new PGlite();
  const store = createPostgresStore({
    query: (text, params) => pglite.query(text, params),
    transaction: (fn) => pglite.transaction((tx) => fn(tx)),
    close: () => pglite.close(),
  });
  await store.init();
  return store;
}

// El mismo contrato debe cumplirse con memoria y con Postgres.
describe.each([
  ['memoria', async () => createMemoryStore()],
  ['Postgres', createPgliteStore],
])('OrderStore (%s)', (_name, createStore) => {
  let store;

  beforeEach(async () => {
    store = await createStore();
  });

  afterEach(async () => {
    await store.close();
  });

  const save = (order) => store.saveOrder(order, (existing) => checkOrderWrite(existing, order));

  it('guarda un pedido y lo devuelve idéntico', async () => {
    const order = sentOrder(1);

    const result = await save(order);
    expect(result.ok).toBe(true);
    expect(await store.getOrder(order.id)).toEqual(order);
    expect(await store.getOrder('no-existe')).toBeNull();
  });

  it('actualiza el estado con una transición válida', async () => {
    const order = sentOrder(1);
    await save(order);

    const started = changeOrderStatus(order, ORDER_STATUS.IN_PROGRESS, { user: cook, now: at(5) });
    const result = await save(started);

    expect(result.ok).toBe(true);
    expect((await store.getOrder(order.id)).status).toBe(ORDER_STATUS.IN_PROGRESS);
  });

  it('rechaza una escritura basada en un estado viejo y conserva lo guardado', async () => {
    const order = sentOrder(1);
    await save(order);
    const started = changeOrderStatus(order, ORDER_STATUS.IN_PROGRESS, { user: cook, now: at(5) });
    await save(started);

    const cancelFromStale = changeOrderStatus(order, ORDER_STATUS.CANCELLED, { user: cashier, now: at(6) });
    const result = await save(cancelFromStale);

    expect(result).toMatchObject({ ok: false, code: ORDER_ERROR.CONFLICT });
    expect((await store.getOrder(order.id)).status).toBe(ORDER_STATUS.IN_PROGRESS);
  });

  it('con dos cambios simultáneos del mismo pedido solo uno gana', async () => {
    const order = sentOrder(1);
    await save(order);

    const startedByA = changeOrderStatus(order, ORDER_STATUS.IN_PROGRESS, { user: cook, now: at(5) });
    const cancelledByB = changeOrderStatus(order, ORDER_STATUS.CANCELLED, { user: cashier, now: at(5) });

    const results = await Promise.all([save(startedByA), save(cancelledByB)]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toHaveLength(1);
  });

  it('con dos creaciones simultáneas del mismo id solo una gana', async () => {
    const order = sentOrder(1);
    const results = await Promise.all([save(order), save(order)]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
  });

  it('lista por estado y por quién lo tomó, del más antiguo al más nuevo', async () => {
    const first = sentOrder(1, at(0));
    const second = sentOrder(2, at(10));
    await save(second);
    await save(first);
    await save(changeOrderStatus(first, ORDER_STATUS.IN_PROGRESS, { user: cook, now: at(20) }));

    const all = await store.listOrders();
    expect(all.map((order) => order.number)).toEqual([1, 2]);

    const onlyNew = await store.listOrders({ statuses: [ORDER_STATUS.NEW] });
    expect(onlyNew.map((order) => order.number)).toEqual([2]);

    expect(await store.listOrders({ createdById: cashier.id })).toHaveLength(2);
    expect(await store.listOrders({ createdById: 'otro' })).toHaveLength(0);
  });

  it('numera de forma consecutiva por día y sin repetir en paralelo', async () => {
    const parallel = await Promise.all(Array.from({ length: 5 }, () => store.nextOrderNumber('2026-10-12')));
    expect([...parallel].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);

    expect(await store.nextOrderNumber('2026-10-13')).toBe(1);
    expect(await store.nextOrderNumber('2026-10-12')).toBe(6);
  });
});
