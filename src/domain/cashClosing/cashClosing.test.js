import { usersSeed } from '@/data/seed/users';
import {
  CASH_CLOSING_ERROR,
  CashClosingError,
  buildCashPending,
  calculateCashDifference,
  calculateExpectedCash,
  createCashClosing,
  isPaidOrder,
  summarizeSales,
  suggestOpeningFloat,
} from '@/domain/cashClosing';
import { ORDER_STATUS } from '@/domain/orders';
import { PAYMENT_METHOD } from '@/domain/payments';

const [cashier] = usersSeed;
const T0 = new Date('2026-10-12T18:00:00.000Z');
const at = (minutes) => new Date(T0.getTime() + minutes * 60_000);

/** Un pedido ya cobrado; solo lleva lo que el cierre necesita leer. */
function paidOrder({ id, method = PAYMENT_METHOD.CASH, amount, minute = 0, status = ORDER_STATUS.DELIVERED }) {
  return {
    id,
    status,
    payment: {
      method,
      amount,
      tendered: amount,
      change: 0,
      paidAt: at(minute).toISOString(),
      receivedBy: { id: cashier.id, name: cashier.name },
    },
  };
}

const expectClosingError = (fn, code) => {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(CashClosingError);
    expect(error.code).toBe(code);
    return;
  }
  throw new Error(`Se esperaba CashClosingError ${code} pero no se lanzó ningún error`);
};

const orders = () => [
  paidOrder({ id: 'o1', method: PAYMENT_METHOD.CASH, amount: 8_500, minute: 5 }),
  paidOrder({ id: 'o2', method: PAYMENT_METHOD.CASH, amount: 4_000, minute: 10 }),
  paidOrder({ id: 'o3', method: PAYMENT_METHOD.CARD, amount: 12_000, minute: 15 }),
  paidOrder({ id: 'o4', method: PAYMENT_METHOD.SINPE, amount: 6_500, minute: 20, status: ORDER_STATUS.NEW }),
];

describe('resumen de ventas', () => {
  it('suma por forma de pago, con las tres siempre presentes', () => {
    const summary = summarizeSales(orders());

    expect(summary.orderCount).toBe(4);
    expect(summary.total).toBe(31_000);
    expect(summary.byMethod).toEqual({
      cash: { count: 2, total: 12_500 },
      card: { count: 1, total: 12_000 },
      sinpe: { count: 1, total: 6_500 },
    });
    expect(summary.firstSaleAt).toBe(at(5).toISOString());
    expect(summary.lastSaleAt).toBe(at(20).toISOString());
  });

  it('sin pedidos devuelve ceros y las tres formas de pago', () => {
    expect(summarizeSales([])).toEqual({
      orderCount: 0,
      total: 0,
      byMethod: {
        cash: { count: 0, total: 0 },
        card: { count: 0, total: 0 },
        sinpe: { count: 0, total: 0 },
      },
      cancelled: { count: 0, total: 0 },
      firstSaleAt: null,
      lastSaleAt: null,
    });
  });

  it('un pedido cobrado que se canceló no cuenta como venta, pero se informa aparte', () => {
    const summary = summarizeSales([
      ...orders(),
      paidOrder({ id: 'o5', method: PAYMENT_METHOD.CASH, amount: 3_000, minute: 25, status: ORDER_STATUS.CANCELLED }),
    ]);

    expect(summary.orderCount).toBe(4);
    expect(summary.total).toBe(31_000);
    expect(summary.byMethod.cash).toEqual({ count: 2, total: 12_500 });
    expect(summary.cancelled).toEqual({ count: 1, total: 3_000 });
  });

  it('ignora los pedidos sin cobro (anteriores al módulo de pagos)', () => {
    const legacy = { id: 'viejo', status: ORDER_STATUS.DELIVERED };
    expect(isPaidOrder(legacy)).toBe(false);
    expect(isPaidOrder({ ...legacy, payment: null })).toBe(false);
    expect(summarizeSales([legacy, ...orders()]).orderCount).toBe(4);
  });

  it('el vuelto no cuenta: se suma lo cobrado, no lo que entregó el cliente', () => {
    const withChange = paidOrder({ id: 'o1', amount: 8_500 });
    withChange.payment = { ...withChange.payment, tendered: 10_000, change: 1_500 };

    expect(summarizeSales([withChange]).byMethod.cash.total).toBe(8_500);
  });
});

describe('cuadre del efectivo', () => {
  it('el efectivo esperado es el fondo inicial más lo cobrado en efectivo', () => {
    expect(calculateExpectedCash(20_000, 12_500)).toBe(32_500);
  });

  it('la diferencia: positivo sobra, negativo falta, cero cuadra', () => {
    expect(calculateCashDifference(32_500, 32_500)).toBe(0);
    expect(calculateCashDifference(33_000, 32_500)).toBe(500);
    expect(calculateCashDifference(32_000, 32_500)).toBe(-500);
  });
});

describe('createCashClosing', () => {
  const close = (overrides = {}) =>
    createCashClosing({
      id: 'cls_1',
      orders: orders(),
      previous: null,
      openingFloat: 20_000,
      countedCash: 32_500,
      user: cashier,
      now: at(60),
      ...overrides,
    });

  it('arma el cierre con ventas, cuadre y quién lo hizo', () => {
    const closing = close({ note: '  Turno de la tarde  ' });

    expect(closing).toEqual({
      id: 'cls_1',
      number: 1,
      closedAt: at(60).toISOString(),
      closedBy: { id: cashier.id, name: cashier.name },
      periodStart: at(5).toISOString(),
      sales: summarizeSales(orders()),
      cash: { openingFloat: 20_000, cashSales: 12_500, expected: 32_500, counted: 32_500, difference: 0 },
      note: 'Turno de la tarde',
    });
  });

  it('registra el faltante cuando se cuenta menos de lo esperado', () => {
    const closing = close({ countedCash: 31_000 });
    expect(closing.cash).toMatchObject({ expected: 32_500, counted: 31_000, difference: -1_500 });
  });

  it('registra el sobrante cuando se cuenta más de lo esperado', () => {
    expect(close({ countedCash: 33_000 }).cash.difference).toBe(500);
  });

  it('tarjeta y SINPE no entran al efectivo esperado', () => {
    const onlyCards = [paidOrder({ id: 'o1', method: PAYMENT_METHOD.CARD, amount: 9_000 })];
    const closing = close({ orders: onlyCards, openingFloat: 5_000, countedCash: 5_000 });

    expect(closing.cash).toMatchObject({ cashSales: 0, expected: 5_000, difference: 0 });
    expect(closing.sales.total).toBe(9_000);
  });

  it('numera de forma consecutiva y arranca el período en el cierre anterior', () => {
    const first = close();
    const second = close({
      id: 'cls_2',
      previous: first,
      orders: [paidOrder({ id: 'o9', amount: 2_000, minute: 90 })],
      openingFloat: first.cash.counted,
      countedCash: 34_500,
      now: at(120),
    });

    expect(second.number).toBe(2);
    expect(second.periodStart).toBe(first.closedAt);
  });

  it('sin pedidos cobrados no hay nada que cerrar', () => {
    expectClosingError(() => close({ orders: [] }), CASH_CLOSING_ERROR.NO_SALES);
    expectClosingError(() => close({ orders: [{ id: 'viejo', status: ORDER_STATUS.NEW }] }), CASH_CLOSING_ERROR.NO_SALES);
  });

  it('si todo lo cobrado se canceló, el cierre se puede hacer y refleja cero ventas', () => {
    const closing = close({
      orders: [paidOrder({ id: 'o1', amount: 3_000, status: ORDER_STATUS.CANCELLED })],
      countedCash: 20_000,
    });

    expect(closing.sales).toMatchObject({ orderCount: 0, total: 0, cancelled: { count: 1, total: 3_000 } });
    expect(closing.cash.difference).toBe(0);
  });

  it.each([
    ['fondo inicial', { openingFloat: -1 }],
    ['fondo inicial', { openingFloat: 1_000.5 }],
    ['fondo inicial', { openingFloat: '20000' }],
    ['efectivo contado', { countedCash: undefined }],
    ['efectivo contado', { countedCash: -5 }],
    ['efectivo contado', { countedCash: NaN }],
  ])('rechaza un monto inválido en el %s (%p)', (_name, overrides) => {
    expectClosingError(() => close(overrides), CASH_CLOSING_ERROR.INVALID_AMOUNT);
  });

  it('rechaza un identificador inválido y una observación demasiado larga', () => {
    expectClosingError(() => close({ id: '' }), CASH_CLOSING_ERROR.INVALID_ID);
    expectClosingError(() => close({ id: 'con espacios' }), CASH_CLOSING_ERROR.INVALID_ID);
    expectClosingError(() => close({ id: undefined }), CASH_CLOSING_ERROR.INVALID_ID);
    expectClosingError(() => close({ note: 'x'.repeat(201) }), CASH_CLOSING_ERROR.INVALID_NOTE);
    expectClosingError(() => close({ note: 42 }), CASH_CLOSING_ERROR.INVALID_NOTE);
  });

  it('acepta cero de fondo y cero contado', () => {
    const closing = close({
      orders: [paidOrder({ id: 'o1', method: PAYMENT_METHOD.CARD, amount: 4_000 })],
      openingFloat: 0,
      countedCash: 0,
    });
    expect(closing.cash).toMatchObject({ expected: 0, counted: 0, difference: 0 });
  });
});

describe('lo pendiente por cerrar', () => {
  it('sin cierre anterior sugiere fondo 0 y arranca en el primer cobro', () => {
    const pending = buildCashPending({ orders: orders(), previous: null });

    expect(pending).toMatchObject({
      since: at(5).toISOString(),
      suggestedOpeningFloat: 0,
      lastClosing: null,
      closable: true,
    });
    expect(pending.sales.total).toBe(31_000);
  });

  it('con un cierre anterior sugiere el efectivo que se contó entonces', () => {
    const previous = createCashClosing({
      id: 'cls_1',
      orders: orders(),
      previous: null,
      openingFloat: 20_000,
      countedCash: 32_000,
      user: cashier,
      now: at(60),
    });
    const pending = buildCashPending({ orders: [paidOrder({ id: 'o9', amount: 1_000, minute: 90 })], previous });

    expect(suggestOpeningFloat(previous)).toBe(32_000);
    expect(pending).toMatchObject({
      since: at(60).toISOString(),
      suggestedOpeningFloat: 32_000,
      lastClosing: { number: 1, closedAt: at(60).toISOString() },
    });
  });

  it('sin pedidos cobrados no es cerrable', () => {
    expect(buildCashPending({ orders: [], previous: null })).toMatchObject({ closable: false, since: null });
  });
});
