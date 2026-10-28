import {
  PAYMENT_ERROR,
  PAYMENT_METHOD,
  PAYMENT_METHODS,
  PaymentError,
  calculateChange,
  createPayment,
  isValidPayment,
  suggestTenderedAmounts,
} from '@/domain/payments';

const receivedBy = { id: 'user-cajero', name: 'Cajero demo' };
const NOW = new Date('2026-10-12T18:00:00.000Z');

function expectPaymentError(fn, code) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(PaymentError);
    expect(error.code).toBe(code);
    return;
  }
  throw new Error(`Se esperaba PaymentError ${code} pero no se lanzó ningún error`);
}

describe('efectivo y vuelto', () => {
  it('calcula el vuelto: lo entregado menos el total', () => {
    expect(calculateChange(8_500, 10_000)).toBe(1_500);
    expect(calculateChange(8_500, 8_500)).toBe(0);
    expect(calculateChange(8_500, 5_000)).toBe(-3_500);
  });

  it('registra el efectivo recibido y el vuelto a devolver', () => {
    const payment = createPayment({ method: PAYMENT_METHOD.CASH, total: 8_500, tendered: 10_000, receivedBy, now: NOW });

    expect(payment).toEqual({
      method: 'cash',
      amount: 8_500,
      tendered: 10_000,
      change: 1_500,
      paidAt: NOW.toISOString(),
      receivedBy,
    });
  });

  it('acepta el pago exacto sin vuelto', () => {
    const payment = createPayment({ method: PAYMENT_METHOD.CASH, total: 8_500, tendered: 8_500, receivedBy });
    expect(payment.change).toBe(0);
  });

  it('rechaza el efectivo que no alcanza', () => {
    expectPaymentError(
      () => createPayment({ method: PAYMENT_METHOD.CASH, total: 8_500, tendered: 8_499, receivedBy }),
      PAYMENT_ERROR.INSUFFICIENT,
    );
  });

  it.each([undefined, null, 'diez mil', 1_000.5, -5, NaN])('rechaza un monto recibido inválido (%p)', (tendered) => {
    expectPaymentError(
      () => createPayment({ method: PAYMENT_METHOD.CASH, total: 8_500, tendered, receivedBy }),
      PAYMENT_ERROR.INVALID_AMOUNT,
    );
  });
});

describe('tarjeta y SINPE Móvil', () => {
  it.each([PAYMENT_METHOD.CARD, PAYMENT_METHOD.SINPE])('%s cobra el total exacto, sin vuelto', (method) => {
    const payment = createPayment({ method, total: 8_500, receivedBy, now: NOW });

    expect(payment).toMatchObject({ method, amount: 8_500, tendered: 8_500, change: 0 });
  });

  it('ignora un monto recibido que no sea efectivo', () => {
    const payment = createPayment({ method: PAYMENT_METHOD.SINPE, total: 8_500, tendered: 50_000, receivedBy });
    expect(payment).toMatchObject({ tendered: 8_500, change: 0 });
  });
});

describe('validaciones', () => {
  it('rechaza una forma de pago desconocida', () => {
    expectPaymentError(
      () => createPayment({ method: 'cheque', total: 1_000, receivedBy }),
      PAYMENT_ERROR.INVALID_METHOD,
    );
    expectPaymentError(
      () => createPayment({ method: undefined, total: 1_000, receivedBy }),
      PAYMENT_ERROR.INVALID_METHOD,
    );
  });

  it('ofrece las tres formas de pago', () => {
    expect(PAYMENT_METHODS).toEqual(['cash', 'card', 'sinpe']);
  });

  it('isValidPayment acepta un cobro coherente con el total', () => {
    const payment = createPayment({ method: PAYMENT_METHOD.CASH, total: 8_500, tendered: 10_000, receivedBy });
    expect(isValidPayment(payment, 8_500)).toBe(true);
  });

  it('isValidPayment rechaza lo que no cuadra con el total del pedido', () => {
    const payment = createPayment({ method: PAYMENT_METHOD.CASH, total: 8_500, tendered: 10_000, receivedBy });

    expect(isValidPayment(payment, 9_000)).toBe(false); // el pedido cambió de total
    expect(isValidPayment({ ...payment, change: 0 }, 8_500)).toBe(false); // vuelto inventado
    expect(isValidPayment({ ...payment, tendered: 5_000, change: -3_500 }, 8_500)).toBe(false);
    expect(isValidPayment({ ...payment, method: 'cheque' }, 8_500)).toBe(false);
    expect(isValidPayment({ ...payment, paidAt: 'ayer' }, 8_500)).toBe(false);
    expect(isValidPayment({ ...payment, receivedBy: null }, 8_500)).toBe(false);
    expect(isValidPayment(null, 8_500)).toBe(false);
    expect(isValidPayment(undefined, 8_500)).toBe(false);
    expect(isValidPayment('pagado', 8_500)).toBe(false);
  });

  it('isValidPayment no admite vuelto en tarjeta ni SINPE', () => {
    const card = createPayment({ method: PAYMENT_METHOD.CARD, total: 8_500, receivedBy });
    expect(isValidPayment({ ...card, tendered: 10_000, change: 1_500 }, 8_500)).toBe(false);
  });
});

describe('montos sugeridos para "paga con"', () => {
  it('redondea hacia arriba a montos de billete, sin repetir y sin el total exacto', () => {
    expect(suggestTenderedAmounts(8_500)).toEqual([9_000, 10_000, 20_000, 50_000]);
    expect(suggestTenderedAmounts(12_300)).toEqual([13_000, 15_000, 20_000, 50_000]);
    expect(suggestTenderedAmounts(400)).toEqual([1_000, 5_000, 10_000, 20_000]);
  });

  it('no sugiere un monto igual al total y limita la lista', () => {
    // ₡10.000 ya es un billete: el siguiente nivel es ₡20.000.
    expect(suggestTenderedAmounts(10_000)).toEqual([20_000, 50_000]);
    expect(suggestTenderedAmounts(60_000)).toEqual([100_000]);
    expect(suggestTenderedAmounts(8_500).every((amount) => amount > 8_500)).toBe(true);
  });
});
