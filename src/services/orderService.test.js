import { createMemoryOrderRepository } from '@/data/memory/createMemoryOrderRepository';
import { menuSeed } from '@/data/seed/menu';
import { usersSeed } from '@/data/seed/users';
import { findProduct } from '@/domain/menu';
import {
  ORDER_ERROR,
  ORDER_STATUS,
  addItem,
  createDraftOrder,
  createOrderItem,
  setCustomerName,
} from '@/domain/orders';
import { PAYMENT_ERROR, PAYMENT_METHOD } from '@/domain/payments';
import { createOrderService } from './orderService';

const [cashier, cook] = usersSeed;
const PAYMENT = { method: PAYMENT_METHOD.CARD };

function setup(startDate = new Date('2026-10-12T12:00:00')) {
  let current = startDate;
  const clock = { now: () => current, set: (date) => (current = date) };
  const orderRepository = createMemoryOrderRepository({ now: clock.now });
  const service = createOrderService({ orderRepository, now: clock.now });
  return { service, orderRepository, clock };
}

function draftWithOneItem() {
  const order = setCustomerName(createDraftOrder({ createdBy: cashier }), 'María Pérez');
  const item = createOrderItem({ product: findProduct(menuSeed, 'prod-papas'), quantity: 1 });
  return addItem(order, item);
}

describe('flujo caja → cocina', () => {
  it('cocina recibe el pedido nuevo apenas el cajero lo envía', async () => {
    const { service } = setup();
    const received = [];
    service.subscribe((event) => received.push(event.order));

    const sent = await service.sendToKitchen(draftWithOneItem(), cashier, PAYMENT);

    expect(received).toHaveLength(1);
    expect(received[0].id).toBe(sent.id);
    expect(received[0].status).toBe(ORDER_STATUS.NEW);
    expect(await service.listKitchenOrders()).toHaveLength(1);
  });

  it('asigna números consecutivos y los reinicia al día siguiente', async () => {
    const { service, clock } = setup(new Date('2026-10-12T12:00:00'));

    const first = await service.sendToKitchen(draftWithOneItem(), cashier, PAYMENT);
    const second = await service.sendToKitchen(draftWithOneItem(), cashier, PAYMENT);
    clock.set(new Date('2026-10-13T09:00:00'));
    const nextDay = await service.sendToKitchen(draftWithOneItem(), cashier, PAYMENT);

    expect([first.number, second.number, nextDay.number]).toEqual([1, 2, 1]);
  });

  it('reenviar el mismo borrador no duplica el pedido ni gasta otro número', async () => {
    const { service } = setup();
    const received = [];
    service.subscribe((event) => received.push(event.order));
    const draft = draftWithOneItem();

    const first = await service.sendToKitchen(draft, cashier, PAYMENT);
    const retry = await service.sendToKitchen(draft, cashier, PAYMENT);
    const next = await service.sendToKitchen(draftWithOneItem(), cashier, PAYMENT);

    expect(retry).toEqual(first);
    expect(received).toHaveLength(2);
    expect(next.number).toBe(2);
  });

  it('cocina avanza el estado y caja ve cada cambio', async () => {
    const { service } = setup();
    const statuses = [];
    service.subscribe((event) => statuses.push(event.order.status));

    const sent = await service.sendToKitchen(draftWithOneItem(), cashier, PAYMENT);
    await service.startPreparation(sent.id, cook);
    await service.markReady(sent.id, cook);
    const delivered = await service.markDelivered(sent.id, cashier);

    expect(statuses).toEqual([
      ORDER_STATUS.NEW,
      ORDER_STATUS.IN_PROGRESS,
      ORDER_STATUS.READY,
      ORDER_STATUS.DELIVERED,
    ]);
    expect(delivered.status).toBe(ORDER_STATUS.DELIVERED);
    expect(await service.listKitchenOrders()).toHaveLength(0);
  });

  it('rechaza que dos cocineros inicien el mismo pedido', async () => {
    const { service } = setup();
    const sent = await service.sendToKitchen(draftWithOneItem(), cashier, PAYMENT);

    await service.startPreparation(sent.id, cook);

    await expect(service.startPreparation(sent.id, cook)).rejects.toMatchObject({
      code: ORDER_ERROR.INVALID_TRANSITION,
    });
  });

  it('rechaza acciones sin permiso y pedidos inexistentes', async () => {
    const { service } = setup();
    const sent = await service.sendToKitchen(draftWithOneItem(), cashier, PAYMENT);

    await expect(service.startPreparation(sent.id, cashier)).rejects.toMatchObject({
      code: ORDER_ERROR.FORBIDDEN,
    });
    await expect(service.markReady('no-existe', cook)).rejects.toMatchObject({
      code: ORDER_ERROR.ORDER_NOT_FOUND,
    });
  });

  it('cancelar un suscriptor deja de entregarle eventos', async () => {
    const { service } = setup();
    const listener = jest.fn();
    const unsubscribe = service.subscribe(listener);

    await service.sendToKitchen(draftWithOneItem(), cashier, PAYMENT);
    unsubscribe();
    await service.sendToKitchen(draftWithOneItem(), cashier, PAYMENT);

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('cobro antes de cocina', () => {
  it('sin pago no sale nada a cocina', async () => {
    const { service } = setup();
    const received = [];
    service.subscribe((event) => received.push(event.order));

    await expect(service.sendToKitchen(draftWithOneItem(), cashier)).rejects.toMatchObject({
      code: ORDER_ERROR.PAYMENT_REQUIRED,
    });

    expect(received).toHaveLength(0);
    expect(await service.listKitchenOrders()).toHaveLength(0);
  });

  it('un pago inválido no gasta un número de pedido', async () => {
    const { service } = setup();

    await expect(
      service.sendToKitchen(draftWithOneItem(), cashier, { method: PAYMENT_METHOD.CASH, tendered: 1 }),
    ).rejects.toMatchObject({ code: PAYMENT_ERROR.INSUFFICIENT });
    await expect(
      service.sendToKitchen(draftWithOneItem(), cashier, { method: 'cheque' }),
    ).rejects.toMatchObject({ code: PAYMENT_ERROR.INVALID_METHOD });

    const sent = await service.sendToKitchen(draftWithOneItem(), cashier, PAYMENT);
    expect(sent.number).toBe(1);
  });

  it('guarda el pago con el pedido: efectivo recibido, vuelto y quién cobró', async () => {
    const { service } = setup();
    const draft = draftWithOneItem();

    const sent = await service.sendToKitchen(draft, cashier, { method: PAYMENT_METHOD.CASH, tendered: 5_000 });

    expect(sent.payment).toMatchObject({
      method: 'cash',
      amount: draft.totals.total,
      tendered: 5_000,
      change: 5_000 - draft.totals.total,
      receivedBy: { id: cashier.id },
    });
    expect((await service.listKitchenOrders())[0].payment).toEqual(sent.payment);
  });

  it('el cocinero no puede cobrar ni enviar', async () => {
    const { service } = setup();

    await expect(service.sendToKitchen(draftWithOneItem(), cook, PAYMENT)).rejects.toMatchObject({
      code: ORDER_ERROR.FORBIDDEN,
    });
  });
});
