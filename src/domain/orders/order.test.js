import { menuSeed } from '@/data/seed/menu';
import { usersSeed } from '@/data/seed/users';
import { findProduct } from '@/domain/menu';
import {
  ORDER_ERROR,
  ORDER_STATUS,
  OrderError,
  addItem,
  changeOrderStatus,
  createDraftOrder,
  createOrderItem,
  formatOrderNumber,
  getElapsedSinceSent,
  getStatusTime,
  isVisibleInKitchen,
  removeItem,
  sendOrderToKitchen,
  setItemNotes,
  setCustomerName,
  setItemQuantity,
  setOrderNote,
} from '@/domain/orders';

const [cashier, cook, admin] = usersSeed;
const product = (id) => findProduct(menuSeed, id);
const extra = (id) => menuSeed.extras.find((candidate) => candidate.id === id);

const T0 = new Date('2026-10-12T18:35:00.000Z');
const minutesAfter = (minutes) => new Date(T0.getTime() + minutes * 60_000);

function expectOrderError(fn, code) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(OrderError);
    expect(error.code).toBe(code);
    return;
  }
  throw new Error(`Se esperaba OrderError ${code} pero no se lanzó ningún error`);
}

/** El pedido del enunciado: 2 hamburguesas (1 con queso extra, sin cebolla), 2 Coca-Cola, 1 papas. */
function buildExampleOrder() {
  let order = createDraftOrder({ createdBy: cashier, now: T0 });
  order = setCustomerName(order, 'María Pérez', T0);
  order = addItem(
    order,
    createOrderItem({
      product: product('prod-hamburguesa-clasica'),
      quantity: 2,
      extras: [{ extra: extra('extra-queso'), quantity: 1 }],
      notes: ['Sin cebolla'],
    }),
    T0,
  );
  order = addItem(order, createOrderItem({ product: product('prod-coca-cola'), quantity: 2 }), T0);
  order = addItem(order, createOrderItem({ product: product('prod-papas'), quantity: 1 }), T0);
  return order;
}

describe('creación y cálculo de totales', () => {
  it('crea un borrador vacío con quién lo tomó y cuándo', () => {
    const order = createDraftOrder({ createdBy: cashier, now: T0 });

    expect(order.status).toBe(ORDER_STATUS.DRAFT);
    expect(order.number).toBeNull();
    expect(order.createdBy).toEqual({ id: cashier.id, name: cashier.name });
    expect(order.createdAt).toBe(T0.toISOString());
    expect(order.totals).toEqual({ subtotal: 0, total: 0, itemCount: 0 });
  });

  it('calcula subtotales y total del pedido de ejemplo', () => {
    const order = buildExampleOrder();

    // 2 × 3500 + 1 queso × 500 = 7500 | 2 × 1000 = 2000 | 1 × 1500 = 1500
    expect(order.totals.total).toBe(11_000);
    expect(order.totals.subtotal).toBe(11_000);
    expect(order.totals.itemCount).toBe(5);
  });

  it('guarda precio y nombre al momento de tomar el pedido', () => {
    const hamburguesa = product('prod-hamburguesa-clasica');
    const item = createOrderItem({ product: hamburguesa });
    const changedProduct = { ...hamburguesa, price: 9999, name: 'Otro nombre' };

    expect(changedProduct.price).not.toBe(item.unitPrice);
    expect(item.unitPrice).toBe(3500);
    expect(item.name).toBe('Hamburguesa clásica');
  });
});

describe('líneas del pedido', () => {
  it('fusiona líneas idénticas sumando cantidades y extras', () => {
    let order = createDraftOrder({ createdBy: cashier, now: T0 });
    const make = () =>
      createOrderItem({
        product: product('prod-hamburguesa-clasica'),
        quantity: 2,
        extras: [{ extra: extra('extra-queso'), quantity: 1 }],
        notes: ['Sin cebolla'],
      });

    order = addItem(order, make(), T0);
    order = addItem(order, make(), T0);

    expect(order.items).toHaveLength(1);
    expect(order.items[0].quantity).toBe(4);
    expect(order.items[0].extras[0].quantity).toBe(2);
    expect(order.totals.total).toBe(4 * 3500 + 2 * 500);
  });

  it('no fusiona si cambian los extras o las observaciones', () => {
    let order = createDraftOrder({ createdBy: cashier, now: T0 });
    const base = product('prod-hamburguesa-clasica');

    order = addItem(order, createOrderItem({ product: base }), T0);
    order = addItem(order, createOrderItem({ product: base, notes: ['Sin cebolla'] }), T0);
    order = addItem(
      order,
      createOrderItem({ product: base, extras: [{ extra: extra('extra-queso') }] }),
      T0,
    );

    expect(order.items).toHaveLength(3);
  });

  it('rechaza extras que no pertenecen al producto', () => {
    expectOrderError(
      () =>
        createOrderItem({
          product: product('prod-coca-cola'),
          extras: [{ extra: extra('extra-queso') }],
        }),
      ORDER_ERROR.EXTRA_NOT_ALLOWED,
    );
  });

  it('rechaza más unidades de un extra que unidades del producto', () => {
    expectOrderError(
      () =>
        createOrderItem({
          product: product('prod-hamburguesa-clasica'),
          quantity: 1,
          extras: [{ extra: extra('extra-queso'), quantity: 2 }],
        }),
      ORDER_ERROR.EXTRA_QUANTITY_EXCEEDED,
    );
  });

  it('rechaza cantidades inválidas y productos inactivos', () => {
    const base = product('prod-papas');
    expectOrderError(() => createOrderItem({ product: base, quantity: 0 }), ORDER_ERROR.INVALID_QUANTITY);
    expectOrderError(() => createOrderItem({ product: base, quantity: 1.5 }), ORDER_ERROR.INVALID_QUANTITY);
    expectOrderError(
      () => createOrderItem({ product: { ...base, active: false } }),
      ORDER_ERROR.PRODUCT_UNAVAILABLE,
    );
  });

  it('al bajar la cantidad, los extras no superan las unidades restantes', () => {
    let order = createDraftOrder({ createdBy: cashier, now: T0 });
    order = addItem(
      order,
      createOrderItem({
        product: product('prod-hamburguesa-clasica'),
        quantity: 3,
        extras: [{ extra: extra('extra-queso'), quantity: 3 }],
      }),
      T0,
    );

    order = setItemQuantity(order, order.items[0].id, 1, T0);

    expect(order.items[0].extras[0].quantity).toBe(1);
    expect(order.totals.total).toBe(3500 + 500);
  });

  it('cantidad 0 elimina la línea y removeItem también', () => {
    let order = buildExampleOrder();
    const [first, second] = order.items;

    order = setItemQuantity(order, first.id, 0, T0);
    expect(order.items.map((item) => item.id)).not.toContain(first.id);

    order = removeItem(order, second.id, T0);
    expect(order.items).toHaveLength(1);
    expectOrderError(() => removeItem(order, 'no-existe', T0), ORDER_ERROR.ITEM_NOT_FOUND);
  });

  it('permite observaciones por línea y por pedido', () => {
    let order = buildExampleOrder();
    order = setItemNotes(order, order.items[1].id, ['  Sin hielo ', 'Sin hielo', ''], T0);
    order = setOrderNote(order, '  Cliente alérgico al maní  ', T0);

    expect(order.items[1].notes).toEqual(['Sin hielo']);
    expect(order.note).toBe('Cliente alérgico al maní');
  });

  it('no modifica el pedido original (inmutable)', () => {
    const order = buildExampleOrder();
    const itemsBefore = order.items;

    setItemQuantity(order, order.items[0].id, 5, T0);

    expect(order.items).toBe(itemsBefore);
    expect(order.items[0].quantity).toBe(2);
  });
});

describe('nombre del cliente (obligatorio)', () => {
  it('un borrador nuevo no tiene nombre', () => {
    expect(createDraftOrder({ createdBy: cashier, now: T0 }).customerName).toBe('');
  });

  it('se limpia: sin espacios sobrantes ni dobles', () => {
    const order = setCustomerName(createDraftOrder({ createdBy: cashier, now: T0 }), '   María    Pérez  ', T0);
    expect(order.customerName).toBe('María Pérez');
  });

  it('no se puede enviar sin nombre, ni con uno que no sea un nombre', () => {
    let order = addItem(
      createDraftOrder({ createdBy: cashier, now: T0 }),
      createOrderItem({ product: product('prod-papas') }),
      T0,
    );

    expectOrderError(
      () => sendOrderToKitchen(order, { number: 1, user: cashier, now: T0 }),
      ORDER_ERROR.CUSTOMER_NAME_REQUIRED,
    );

    for (const invalid of ['   ', 'A', '...', '12', '--']) {
      order = setCustomerName(order, invalid, T0);
      expectOrderError(
        () => sendOrderToKitchen(order, { number: 1, user: cashier, now: T0 }),
        ORDER_ERROR.CUSTOMER_NAME_REQUIRED,
      );
    }
  });

  it('acepta nombres reales: con tildes, iniciales o "Mesa 5"', () => {
    for (const valid of ['Ana', 'José Ángel', 'Ana M.', 'Mesa 5', 'Jo']) {
      let order = addItem(
        createDraftOrder({ createdBy: cashier, now: T0 }),
        createOrderItem({ product: product('prod-papas') }),
        T0,
      );
      order = setCustomerName(order, valid, T0);
      expect(sendOrderToKitchen(order, { number: 1, user: cashier, now: T0 }).customerName).toBe(valid);
    }
  });

  it('no se puede cambiar una vez enviado', () => {
    const sent = sendOrderToKitchen(buildExampleOrder(), { number: 1, user: cashier, now: T0 });
    expectOrderError(() => setCustomerName(sent, 'Otro', T0), ORDER_ERROR.NOT_EDITABLE);
  });
});

describe('envío a cocina y estados', () => {
  it('envía el pedido: pasa a Nuevo, recibe número y queda visible en cocina', () => {
    const sent = sendOrderToKitchen(buildExampleOrder(), { number: 24, user: cashier, now: minutesAfter(1) });

    expect(sent.status).toBe(ORDER_STATUS.NEW);
    expect(sent.number).toBe(24);
    expect(formatOrderNumber(sent.number)).toBe('#024');
    expect(isVisibleInKitchen(sent)).toBe(true);
    expect(getStatusTime(sent, ORDER_STATUS.NEW)).toBe(minutesAfter(1).toISOString());
  });

  it('no envía un pedido vacío', () => {
    const empty = createDraftOrder({ createdBy: cashier, now: T0 });
    expectOrderError(
      () => sendOrderToKitchen(empty, { number: 1, user: cashier }),
      ORDER_ERROR.EMPTY_ORDER,
    );
  });

  it('no permite editar un pedido ya enviado', () => {
    const sent = sendOrderToKitchen(buildExampleOrder(), { number: 1, user: cashier, now: T0 });
    expectOrderError(
      () => setItemQuantity(sent, sent.items[0].id, 3, T0),
      ORDER_ERROR.NOT_EDITABLE,
    );
  });

  it('recorre el flujo completo Nuevo → En preparación → Listo → Entregado', () => {
    let order = sendOrderToKitchen(buildExampleOrder(), { number: 1, user: cashier, now: minutesAfter(0) });
    order = changeOrderStatus(order, ORDER_STATUS.IN_PROGRESS, { user: cook, now: minutesAfter(2) });
    order = changeOrderStatus(order, ORDER_STATUS.READY, { user: cook, now: minutesAfter(12) });
    order = changeOrderStatus(order, ORDER_STATUS.DELIVERED, { user: cashier, now: minutesAfter(14) });

    expect(order.status).toBe(ORDER_STATUS.DELIVERED);
    expect(order.statusHistory.map((entry) => entry.status)).toEqual([
      ORDER_STATUS.DRAFT,
      ORDER_STATUS.NEW,
      ORDER_STATUS.IN_PROGRESS,
      ORDER_STATUS.READY,
      ORDER_STATUS.DELIVERED,
    ]);
    expect(order.statusHistory[2].by.id).toBe(cook.id);
    expect(isVisibleInKitchen(order)).toBe(false);
  });

  it('rechaza saltarse estados o retroceder', () => {
    const sent = sendOrderToKitchen(buildExampleOrder(), { number: 1, user: cashier, now: T0 });

    expectOrderError(
      () => changeOrderStatus(sent, ORDER_STATUS.READY, { user: cook }),
      ORDER_ERROR.INVALID_TRANSITION,
    );
    expectOrderError(
      () => changeOrderStatus(sent, ORDER_STATUS.DRAFT, { user: admin }),
      ORDER_ERROR.INVALID_TRANSITION,
    );
  });

  it('respeta permisos por rol', () => {
    const sent = sendOrderToKitchen(buildExampleOrder(), { number: 1, user: cashier, now: T0 });

    expectOrderError(
      () => changeOrderStatus(sent, ORDER_STATUS.IN_PROGRESS, { user: cashier }),
      ORDER_ERROR.FORBIDDEN,
    );
    expectOrderError(
      () => sendOrderToKitchen(buildExampleOrder(), { number: 1, user: cook }),
      ORDER_ERROR.FORBIDDEN,
    );
    // El administrador tiene acceso total
    expect(changeOrderStatus(sent, ORDER_STATUS.IN_PROGRESS, { user: admin }).status).toBe(
      ORDER_STATUS.IN_PROGRESS,
    );
  });

  it('permite cancelar antes de un estado final pero no después', () => {
    const sent = sendOrderToKitchen(buildExampleOrder(), { number: 1, user: cashier, now: T0 });
    const cancelled = changeOrderStatus(sent, ORDER_STATUS.CANCELLED, { user: cashier, now: T0 });

    expect(cancelled.status).toBe(ORDER_STATUS.CANCELLED);
    expectOrderError(
      () => changeOrderStatus(cancelled, ORDER_STATUS.NEW, { user: admin }),
      ORDER_ERROR.INVALID_TRANSITION,
    );
  });

  it('calcula el tiempo transcurrido desde que llegó a cocina', () => {
    const draft = buildExampleOrder();
    expect(getElapsedSinceSent(draft, minutesAfter(5))).toBeNull();

    const sent = sendOrderToKitchen(draft, { number: 1, user: cashier, now: T0 });
    expect(getElapsedSinceSent(sent, minutesAfter(7))).toBe(7 * 60_000);
  });
});
