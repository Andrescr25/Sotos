import { menuSeed } from '@/data/seed/menu';
import { usersSeed } from '@/data/seed/users';
import { CASH_CLOSING_ERROR } from '@/domain/cashClosing';
import { findProduct } from '@/domain/menu';
import {
  addItem,
  createDraftOrder,
  createOrderItem,
  sendOrderToKitchen,
  setCustomerName,
} from '@/domain/orders';
import { PAYMENT_METHOD } from '@/domain/payments';
import { createMemoryCashClosingRepository } from './createMemoryCashClosingRepository';
import { createMemoryOrderRepository } from './createMemoryOrderRepository';

const [cashier, cook, admin] = usersSeed;

function setup(actor = cashier) {
  const session = { user: actor };
  const orderRepository = createMemoryOrderRepository(); // sin getActor: guarda lo que cumpla las reglas del pedido
  const repository = createMemoryCashClosingRepository({
    orderRepository,
    getActor: () => session.user,
    now: () => new Date('2026-10-12T22:00:00.000Z'),
  });

  /** Cobra un pedido de ₡1.500 (papas). */
  async function charge(payment = { method: PAYMENT_METHOD.CARD }) {
    const draft = addItem(
      setCustomerName(createDraftOrder({ createdBy: cashier }), 'María Pérez'),
      createOrderItem({ product: findProduct(menuSeed, 'prod-papas') }),
    );
    const number = await orderRepository.nextOrderNumber();
    return orderRepository.save(sendOrderToKitchen(draft, { number, user: cashier, payment }));
  }

  return { repository, session, charge };
}

describe('cierre de caja en memoria', () => {
  it('suma lo cobrado, cierra y deja el siguiente cierre en cero', async () => {
    const { repository, charge } = setup();
    await charge({ method: PAYMENT_METHOD.CASH, tendered: 5_000 });
    await charge({ method: PAYMENT_METHOD.SINPE });

    expect(await repository.getPending()).toMatchObject({ closable: true, sales: { orderCount: 2, total: 3_000 } });

    const closing = await repository.close({ id: 'cls_1', openingFloat: 1_000, countedCash: 2_500 });

    expect(closing).toMatchObject({
      number: 1,
      sales: { orderCount: 2, total: 3_000 },
      cash: { cashSales: 1_500, expected: 2_500, counted: 2_500, difference: 0 },
    });
    expect(await repository.getPending()).toMatchObject({ closable: false, suggestedOpeningFloat: 2_500 });
    expect(await repository.list()).toHaveLength(1);
  });

  it('repetir el mismo identificador devuelve el cierre guardado sin duplicarlo', async () => {
    const { repository, charge } = setup();
    await charge();

    const first = await repository.close({ id: 'cls_1', openingFloat: 0, countedCash: 0 });
    await charge();
    const retry = await repository.close({ id: 'cls_1', openingFloat: 0, countedCash: 0 });

    expect(retry).toEqual(first);
    expect(await repository.list()).toHaveLength(1);
    expect((await repository.getPending()).sales.orderCount).toBe(1);
  });

  it('con dos cierres a la vez cada pedido entra en uno solo', async () => {
    const { repository, charge } = setup();
    await charge();
    await charge();

    const results = await Promise.allSettled([
      repository.close({ id: 'cls_a', openingFloat: 0, countedCash: 0 }),
      repository.close({ id: 'cls_b', openingFloat: 0, countedCash: 0 }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected').reason).toMatchObject({
      code: CASH_CLOSING_ERROR.NO_SALES,
    });
    expect((await repository.list())[0].sales.orderCount).toBe(2);
  });

  it('sin pedidos cobrados no hay cierre', async () => {
    const { repository } = setup();
    await expect(repository.close({ id: 'cls_1', openingFloat: 0, countedCash: 0 })).rejects.toMatchObject({
      code: CASH_CLOSING_ERROR.NO_SALES,
    });
  });

  it('solo cajero y administrador pueden ver y cerrar la caja', async () => {
    const { repository, session, charge } = setup();
    await charge();

    for (const user of [cook, null]) {
      session.user = user;
      await expect(repository.getPending()).rejects.toMatchObject({ code: 'forbidden' });
      await expect(repository.list()).rejects.toMatchObject({ code: 'forbidden' });
      await expect(repository.close({ id: 'cls_x', openingFloat: 0, countedCash: 0 })).rejects.toMatchObject({
        code: 'forbidden',
      });
    }

    session.user = admin;
    expect(await repository.close({ id: 'cls_1', openingFloat: 0, countedCash: 0 })).toMatchObject({
      closedBy: { id: admin.id },
    });
  });
});
