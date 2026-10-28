import { menuSeed } from '@/data/seed/menu';
import { usersSeed } from '@/data/seed/users';
import { findProduct } from '@/domain/menu';
import {
  ORDER_ERROR,
  ORDER_STATUS,
  addItem,
  changeOrderStatus,
  checkOrderActor,
  checkOrderWrite,
  createDraftOrder,
  createOrderItem,
  sendOrderToKitchen,
  setCustomerName,
} from '@/domain/orders';
import { PAYMENT_METHOD } from '@/domain/payments';

const [cashier, cook, admin] = usersSeed;
const PAYMENT = { method: PAYMENT_METHOD.CARD };
const T0 = new Date('2026-10-12T18:00:00.000Z');
const at = (minutes) => new Date(T0.getTime() + minutes * 60_000);

function sentOrder() {
  const draft = addItem(
    setCustomerName(createDraftOrder({ createdBy: cashier, now: T0 }), 'María Pérez', T0),
    createOrderItem({ product: findProduct(menuSeed, 'prod-papas'), quantity: 2 }),
    T0,
  );
  return sendOrderToKitchen(draft, { payment: PAYMENT, number: 7, user: cashier, now: at(1) });
}

const codeOf = (verdict) => (verdict.ok ? null : verdict.code);

describe('checkOrderActor', () => {
  const [, , , pendingUser] = usersSeed;

  it('acepta que el cajero de la sesión envíe su pedido', () => {
    expect(checkOrderActor(null, sentOrder(), cashier)).toEqual({ ok: true });
  });

  it('rechaza que alguien firme a nombre de otro', () => {
    const order = sentOrder();
    expect(codeOf(checkOrderActor(null, order, cook))).toBe(ORDER_ERROR.FORBIDDEN);
  });

  it('rechaza un cambio para el que el rol no tiene permiso', () => {
    const existing = sentOrder();
    // El cajero intenta empezar la preparación firmando con su propio usuario.
    const started = changeOrderStatus(existing, ORDER_STATUS.IN_PROGRESS, { user: admin, now: at(2) });
    const signedAsCashier = {
      ...started,
      statusHistory: started.statusHistory.map((change, index, all) =>
        index === all.length - 1 ? { ...change, by: { id: cashier.id, name: cashier.name } } : change,
      ),
    };
    expect(codeOf(checkOrderActor(existing, signedAsCashier, cashier))).toBe(ORDER_ERROR.FORBIDDEN);
  });

  it('acepta al cocinero iniciando y al administrador en cualquier paso', () => {
    const existing = sentOrder();
    const byCook = changeOrderStatus(existing, ORDER_STATUS.IN_PROGRESS, { user: cook, now: at(2) });
    const byAdmin = changeOrderStatus(existing, ORDER_STATUS.IN_PROGRESS, { user: admin, now: at(2) });

    expect(checkOrderActor(existing, byCook, cook)).toEqual({ ok: true });
    expect(checkOrderActor(existing, byAdmin, admin)).toEqual({ ok: true });
  });

  it('rechaza un pago registrado a nombre de otra persona', () => {
    const order = sentOrder();
    const signedByOther = { ...order, payment: { ...order.payment, receivedBy: { id: admin.id, name: admin.name } } };
    expect(codeOf(checkOrderActor(null, signedByOther, cashier))).toBe(ORDER_ERROR.FORBIDDEN);
  });

  it('una cuenta sin rol no puede guardar nada', () => {
    const order = sentOrder();
    expect(codeOf(checkOrderActor(null, order, pendingUser))).toBe(ORDER_ERROR.FORBIDDEN);
  });
});

describe('checkOrderWrite — creación', () => {
  it('acepta un pedido recién enviado a cocina', () => {
    expect(checkOrderWrite(null, sentOrder())).toEqual({ ok: true });
  });

  it('rechaza un pedido sin nombre de cliente', () => {
    const order = sentOrder();
    expect(codeOf(checkOrderWrite(null, { ...order, customerName: '' }))).toBe(ORDER_ERROR.CUSTOMER_NAME_REQUIRED);
    expect(codeOf(checkOrderWrite(null, { ...order, customerName: '...' }))).toBe(
      ORDER_ERROR.CUSTOMER_NAME_REQUIRED,
    );
    const { customerName, ...withoutField } = order; // un cliente de una versión vieja de la app
    expect(codeOf(checkOrderWrite(null, withoutField))).toBe(ORDER_ERROR.CUSTOMER_NAME_REQUIRED);
  });

  it('rechaza un pedido sin pago o con un pago que no cuadra con el total', () => {
    const order = sentOrder();
    const { payment, ...withoutPayment } = order; // un cliente de una versión vieja de la app
    expect(codeOf(checkOrderWrite(null, withoutPayment))).toBe(ORDER_ERROR.PAYMENT_REQUIRED);
    expect(codeOf(checkOrderWrite(null, { ...order, payment: null }))).toBe(ORDER_ERROR.PAYMENT_REQUIRED);
    expect(codeOf(checkOrderWrite(null, { ...order, payment: { ...payment, amount: payment.amount - 1 } }))).toBe(
      ORDER_ERROR.PAYMENT_REQUIRED,
    );
    // Un vuelto inventado: dice que entregó más de lo que cobró sin que cuadre.
    expect(codeOf(checkOrderWrite(null, { ...order, payment: { ...payment, change: 500 } }))).toBe(
      ORDER_ERROR.PAYMENT_REQUIRED,
    );
  });

  it('rechaza guardar un borrador como pedido nuevo', () => {
    const draft = createDraftOrder({ createdBy: cashier, now: T0 });
    expect(codeOf(checkOrderWrite(null, draft))).toBe(ORDER_ERROR.INVALID_TRANSITION);
  });

  it('rechaza totales alterados', () => {
    const order = sentOrder();
    const tampered = { ...order, totals: { ...order.totals, total: 1 } };
    expect(codeOf(checkOrderWrite(null, tampered))).toBe(ORDER_ERROR.INVALID_ORDER);
  });

  it('rechaza datos sin la forma esperada', () => {
    expect(codeOf(checkOrderWrite(null, { id: 'x' }))).toBe(ORDER_ERROR.INVALID_ORDER);
    expect(codeOf(checkOrderWrite(null, null))).toBe(ORDER_ERROR.INVALID_ORDER);
  });
});

describe('checkOrderWrite — actualización', () => {
  it('acepta una transición válida', () => {
    const existing = sentOrder();
    const next = changeOrderStatus(existing, ORDER_STATUS.IN_PROGRESS, { user: cook, now: at(2) });
    expect(checkOrderWrite(existing, next)).toEqual({ ok: true });
  });

  it('rechaza una transición inexistente', () => {
    const existing = sentOrder();
    const jumped = {
      ...existing,
      status: ORDER_STATUS.READY,
      statusHistory: [...existing.statusHistory, { status: ORDER_STATUS.READY, at: at(2).toISOString(), by: cook }],
    };
    expect(codeOf(checkOrderWrite(existing, jumped))).toBe(ORDER_ERROR.INVALID_TRANSITION);
  });

  it('detecta una escritura basada en un estado viejo (otro dispositivo ya cambió el pedido)', () => {
    const stale = sentOrder();
    const startedByCookA = changeOrderStatus(stale, ORDER_STATUS.IN_PROGRESS, { user: cook, now: at(2) });
    // El cajero, con la copia vieja, cancela. IN_PROGRESS -> CANCELLED es válido por sí solo,
    // pero su historial no extiende el que ya está guardado.
    const cancelledFromStale = changeOrderStatus(stale, ORDER_STATUS.CANCELLED, { user: cashier, now: at(3) });

    expect(codeOf(checkOrderWrite(startedByCookA, cancelledFromStale))).toBe(ORDER_ERROR.CONFLICT);
  });

  it('no depende del orden de las claves (Postgres JSONB las reordena)', () => {
    const existing = sentOrder();
    const reorder = (object) =>
      Object.fromEntries(Object.entries(object).reverse().map(([key, value]) => [key, value]));
    const storedLikeJsonb = { ...existing, items: existing.items.map(reorder) };
    const next = changeOrderStatus(existing, ORDER_STATUS.IN_PROGRESS, { user: cook, now: at(2) });

    expect(checkOrderWrite(storedLikeJsonb, next)).toEqual({ ok: true });
  });

  it('rechaza cambiar el nombre del cliente de un pedido ya enviado', () => {
    const existing = sentOrder();
    const next = changeOrderStatus(existing, ORDER_STATUS.IN_PROGRESS, { user: cook, now: at(2) });
    expect(codeOf(checkOrderWrite(existing, { ...next, customerName: 'Otra persona' }))).toBe(
      ORDER_ERROR.INVALID_ORDER,
    );
  });

  it('rechaza cambiar las líneas de un pedido ya enviado', () => {
    const existing = sentOrder();
    const next = changeOrderStatus(existing, ORDER_STATUS.IN_PROGRESS, { user: cook, now: at(2) });
    const edited = { ...next, items: [{ ...next.items[0], quantity: 1 }] };
    expect(codeOf(checkOrderWrite(existing, edited))).toBe(ORDER_ERROR.INVALID_ORDER);
  });

  it('rechaza cambiar el pago de un pedido ya enviado', () => {
    const existing = sentOrder();
    const next = changeOrderStatus(existing, ORDER_STATUS.IN_PROGRESS, { user: cook, now: at(2) });
    const altered = { ...next.payment, method: 'cash', tendered: next.payment.amount + 5_000, change: 5_000 };
    expect(codeOf(checkOrderWrite(existing, { ...next, payment: altered }))).toBe(ORDER_ERROR.INVALID_ORDER);
    expect(codeOf(checkOrderWrite(existing, { ...next, payment: null }))).toBe(ORDER_ERROR.INVALID_ORDER);
  });

  it('un pedido guardado antes de existir el pago sigue avanzando sin él', () => {
    const { payment, ...legacy } = sentOrder();
    const next = changeOrderStatus(legacy, ORDER_STATUS.IN_PROGRESS, { user: cook, now: at(2) });

    expect(next.payment).toBeUndefined();
    expect(checkOrderWrite(legacy, next)).toEqual({ ok: true });
  });
});
