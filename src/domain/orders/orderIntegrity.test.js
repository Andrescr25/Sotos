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

const [cashier, cook] = usersSeed;
const T0 = new Date('2026-10-12T18:00:00.000Z');
const at = (minutes) => new Date(T0.getTime() + minutes * 60_000);

function sentOrder() {
  const draft = addItem(
    createDraftOrder({ createdBy: cashier, now: T0 }),
    createOrderItem({ product: findProduct(menuSeed, 'prod-papas'), quantity: 2 }),
    T0,
  );
  return sendOrderToKitchen(draft, { number: 7, user: cashier, now: at(1) });
}

const codeOf = (verdict) => (verdict.ok ? null : verdict.code);

describe('checkOrderWrite — creación', () => {
  it('acepta un pedido recién enviado a cocina', () => {
    expect(checkOrderWrite(null, sentOrder())).toEqual({ ok: true });
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

  it('rechaza cambiar las líneas de un pedido ya enviado', () => {
    const existing = sentOrder();
    const next = changeOrderStatus(existing, ORDER_STATUS.IN_PROGRESS, { user: cook, now: at(2) });
    const edited = { ...next, items: [{ ...next.items[0], quantity: 1 }] };
    expect(codeOf(checkOrderWrite(existing, edited))).toBe(ORDER_ERROR.INVALID_ORDER);
  });
});
