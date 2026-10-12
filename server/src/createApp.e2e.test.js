import WebSocket from 'ws';
import { createRemoteOrderRepository } from '@/data/remote/createRemoteOrderRepository';
import { menuSeed } from '@/data/seed/menu';
import { usersSeed } from '@/data/seed/users';
import { findProduct } from '@/domain/menu';
import {
  ORDER_ERROR,
  ORDER_STATUS,
  addItem,
  changeOrderStatus,
  createDraftOrder,
  createOrderItem,
} from '@/domain/orders';
import { createOrderService } from '@/services/orderService';
import { createApp } from './createApp';
import { createMemoryStore } from './store/createMemoryStore';

const [cashier, cook] = usersSeed;
const API_KEY = 'clave-de-prueba';

function draft() {
  return addItem(
    createDraftOrder({ createdBy: cashier }),
    createOrderItem({ product: findProduct(menuSeed, 'prod-hamburguesa-clasica'), quantity: 2 }),
  );
}

async function waitFor(check, description, timeoutMs = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Tiempo agotado esperando: ${description}`);
}

describe('servidor de pedidos (HTTP + WebSocket)', () => {
  let store;
  let app;
  let port;
  let baseUrl;
  const cleanups = [];

  const startApp = async (listenPort = 0) => {
    app = createApp({
      store,
      config: { apiKey: API_KEY, timeZone: 'America/Costa_Rica' },
      heartbeatMs: 200,
    });
    port = await app.listen(listenPort);
    baseUrl = `http://127.0.0.1:${port}`;
  };

  /** Una tablet: su propio repositorio remoto y su servicio. */
  function tablet(apiKey = API_KEY) {
    const orderRepository = createRemoteOrderRepository({
      baseUrl,
      apiKey,
      fetchImpl: fetch,
      WebSocketImpl: WebSocket,
      reconnectMinMs: 20,
      reconnectMaxMs: 100,
    });
    const service = createOrderService({ orderRepository });
    return { orderRepository, service };
  }

  /** Suscribe y guarda todos los eventos recibidos. */
  function listen(device) {
    const events = [];
    const unsubscribe = device.service.subscribe((event) => events.push(event));
    cleanups.push(unsubscribe);
    return events;
  }

  const isConnected = (events) => events.filter((event) => event.type === 'connection').at(-1)?.connected === true;

  beforeEach(async () => {
    store = createMemoryStore();
    await startApp();
  });

  afterEach(async () => {
    cleanups.splice(0).forEach((cleanup) => cleanup());
    await app.close();
  });

  it('responde /health sin clave y rechaza el resto sin ella', async () => {
    expect((await fetch(`${baseUrl}/health`)).status).toBe(200);
    expect((await fetch(`${baseUrl}/orders`)).status).toBe(401);
    expect((await fetch(`${baseUrl}/orders`, { headers: { 'x-api-key': 'otra' } })).status).toBe(401);
  });

  it('una tablet con clave incorrecta recibe unauthorized', async () => {
    const intruder = tablet('clave-mala');
    await expect(intruder.orderRepository.list()).rejects.toMatchObject({ code: ORDER_ERROR.UNAUTHORIZED });
  });

  it('cierra el WebSocket si la clave es incorrecta', async () => {
    const closeCode = await new Promise((resolve) => {
      const socket = new WebSocket(`ws://127.0.0.1:${port}/realtime`);
      socket.on('open', () => socket.send(JSON.stringify({ type: 'auth', apiKey: 'mala' })));
      socket.on('close', (code) => resolve(code));
    });
    expect(closeCode).toBe(4401);
  });

  it('el pedido enviado por caja aparece en cocina y los cambios de cocina llegan a caja', async () => {
    const caja = tablet();
    const cocina = tablet();
    const cajaEvents = listen(caja);
    const cocinaEvents = listen(cocina);
    await waitFor(() => isConnected(cajaEvents) && isConnected(cocinaEvents), 'ambas tablets conectadas');

    const sent = await caja.service.sendToKitchen(draft(), cashier);

    await waitFor(
      () => cocinaEvents.some((event) => event.type === 'order:saved' && event.order.id === sent.id),
      'cocina recibe el pedido nuevo',
    );
    const received = cocinaEvents.find((event) => event.type === 'order:saved').order;
    expect(received.status).toBe(ORDER_STATUS.NEW);
    expect(received.number).toBe(1);
    expect(await cocina.service.listKitchenOrders()).toHaveLength(1);

    await cocina.service.startPreparation(sent.id, cook);
    await waitFor(
      () => cajaEvents.some((event) => event.order?.status === ORDER_STATUS.IN_PROGRESS),
      'caja ve que cocina empezó',
    );

    await cocina.service.markReady(sent.id, cook);
    await caja.service.markDelivered(sent.id, cashier);
    expect(await cocina.service.listKitchenOrders()).toHaveLength(0);
  });

  it('dos cajas reciben números distintos y consecutivos', async () => {
    const cajaA = tablet();
    const cajaB = tablet();

    const sent = await Promise.all([
      cajaA.service.sendToKitchen(draft(), cashier),
      cajaB.service.sendToKitchen(draft(), cashier),
      cajaA.service.sendToKitchen(draft(), cashier),
    ]);

    expect(sent.map((order) => order.number).sort()).toEqual([1, 2, 3]);
  });

  it('rechaza con conflicto un cambio basado en una copia vieja del pedido', async () => {
    const caja = tablet();
    const cocina = tablet();
    const sent = await caja.service.sendToKitchen(draft(), cashier);

    await cocina.service.startPreparation(sent.id, cook);

    // La caja todavía tiene en pantalla el pedido como "Nuevo" y lo cancela.
    const stale = changeOrderStatus(sent, ORDER_STATUS.CANCELLED, { user: cashier });
    await expect(caja.orderRepository.save(stale)).rejects.toMatchObject({ code: ORDER_ERROR.CONFLICT });

    const current = await caja.orderRepository.getById(sent.id);
    expect(current.status).toBe(ORDER_STATUS.IN_PROGRESS);
  });

  it('dos cocineros no pueden iniciar el mismo pedido', async () => {
    const caja = tablet();
    const cocinaA = tablet();
    const cocinaB = tablet();
    const sent = await caja.service.sendToKitchen(draft(), cashier);

    const results = await Promise.allSettled([
      cocinaA.service.startPreparation(sent.id, cook),
      cocinaB.service.startPreparation(sent.id, cook),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect([ORDER_ERROR.INVALID_TRANSITION, ORDER_ERROR.CONFLICT]).toContain(rejected.reason.code);
  });

  it('devuelve null al pedir un pedido que no existe', async () => {
    const caja = tablet();
    expect(await caja.orderRepository.getById('no-existe')).toBeNull();
  });

  it('cocina se reconecta sola si el servidor se reinicia y sigue recibiendo pedidos', async () => {
    const caja = tablet();
    const cocina = tablet();
    const cocinaEvents = listen(cocina);
    await waitFor(() => isConnected(cocinaEvents), 'cocina conectada');

    // Reinicio del servidor (por ejemplo un despliegue en Render), mismo puerto y mismos datos.
    await app.close();
    await waitFor(() => !isConnected(cocinaEvents), 'cocina detecta la desconexión');
    await startApp(port);
    await waitFor(() => isConnected(cocinaEvents), 'cocina se reconecta');

    const sent = await caja.service.sendToKitchen(draft(), cashier);
    await waitFor(
      () => cocinaEvents.some((event) => event.type === 'order:saved' && event.order.id === sent.id),
      'cocina recibe el pedido tras reconectar',
    );
  });
});
