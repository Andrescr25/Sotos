import WebSocket from 'ws';
import { createHttpClient } from '@/data/remote/createHttpClient';
import { createRealtimeClient } from '@/data/remote/createRealtimeClient';
import { createRemoteAccountRepositories } from '@/data/remote/createRemoteAccountRepositories';
import { createRemoteOrderRepository } from '@/data/remote/createRemoteOrderRepository';
import { createMemoryTokenStorage } from '@/data/session/createMemoryTokenStorage';
import { createSessionStore } from '@/data/session/createSessionStore';
import { menuSeed } from '@/data/seed/menu';
import { findProduct } from '@/domain/menu';
import {
  ORDER_ERROR,
  ORDER_STATUS,
  addItem,
  changeOrderStatus,
  createDraftOrder,
  createOrderItem,
} from '@/domain/orders';
import { ROLES, USER_ERROR } from '@/domain/users';
import { createOrderService } from '@/services/orderService';
import { createApp } from './createApp';
import { createMemoryStore } from './store/createMemoryStore';
import { createMemoryUserStore } from './store/createMemoryUserStore';

function draftFor(user) {
  return addItem(
    createDraftOrder({ createdBy: user }),
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
  let orderStore;
  let userStore;
  let app;
  let port;
  let baseUrl;
  const cleanups = [];

  const startApp = async (listenPort = 0, loginRateLimit = { max: 1000, windowMs: 60_000 }) => {
    app = createApp({
      orderStore,
      userStore,
      config: { timeZone: 'America/Costa_Rica', loginRateLimit },
      heartbeatMs: 200,
    });
    port = await app.listen(listenPort);
    baseUrl = `http://127.0.0.1:${port}`;
  };

  /** Una tablet: su propia sesión, repositorios y servicio de pedidos. */
  function tablet() {
    const session = createSessionStore({ storage: createMemoryTokenStorage() });
    const http = createHttpClient({ baseUrl, session, fetchImpl: fetch });
    const realtime = createRealtimeClient({
      baseUrl,
      session,
      WebSocketImpl: WebSocket,
      reconnectMinMs: 20,
      reconnectMaxMs: 100,
    });
    const accounts = createRemoteAccountRepositories({ http, realtime, session });
    const orderRepository = createRemoteOrderRepository({ http, realtime });
    return {
      session,
      http,
      ...accounts,
      orderRepository,
      orderService: createOrderService({ orderRepository }),
    };
  }

  /** Guarda en `events` todo lo que reciba la suscripción dada. */
  function collect(subscribe) {
    const events = [];
    cleanups.push(subscribe((event) => events.push(event)));
    return events;
  }

  const isConnected = (events) =>
    events.filter((event) => event.type === 'connection').at(-1)?.connected === true;

  /** Registra una cuenta nueva (queda sin rol) en una tablet nueva. */
  async function registerStaff(username, name = username) {
    const device = tablet();
    const user = await device.authRepository.register({ name, username, password: 'secreta1' });
    return { device, user };
  }

  /** Tablet del administrador inicial, con sesión iniciada. */
  async function adminTablet() {
    const device = tablet();
    const user = await device.authRepository.login({ username: 'admin', password: 'admin123' });
    return { device, user };
  }

  /** Crea una cuenta y la deja con el rol dado; devuelve su tablet con sesión y el usuario ya actualizado. */
  async function staffWithRole(role, username) {
    const { device, user } = await registerStaff(username);
    const admin = await adminTablet();
    const updated = await admin.device.userRepository.setAccess(user.id, { role });
    return { device, user: updated, admin };
  }

  beforeEach(async () => {
    orderStore = createMemoryStore();
    userStore = createMemoryUserStore();
    await startApp();
    await app.authService.ensureAdmin({ username: 'admin', password: 'admin123', name: 'Administrador' });
  });

  afterEach(async () => {
    cleanups.splice(0).forEach((cleanup) => cleanup());
    await app.close();
  });

  describe('acceso y roles', () => {
    it('responde /health sin sesión y exige sesión para lo demás', async () => {
      expect((await fetch(`${baseUrl}/health`)).status).toBe(200);
      expect((await fetch(`${baseUrl}/orders`)).status).toBe(401);
      expect((await fetch(`${baseUrl}/users`)).status).toBe(401);
      expect(
        (await fetch(`${baseUrl}/orders`, { headers: { Authorization: 'Bearer inventado' } })).status,
      ).toBe(401);
    });

    it('quien se registra queda SIN rol y no puede ver pedidos ni usuarios', async () => {
      const { device, user } = await registerStaff('maria', 'María Pérez');

      expect(user).toMatchObject({ name: 'María Pérez', role: null, active: true });
      await expect(device.orderRepository.list()).rejects.toMatchObject({ code: ORDER_ERROR.FORBIDDEN });
      await expect(device.userRepository.list()).rejects.toMatchObject({ code: USER_ERROR.FORBIDDEN });
    });

    it('credenciales incorrectas y usuario repetido dan el error correspondiente', async () => {
      await registerStaff('maria');
      const other = tablet();

      await expect(
        other.authRepository.login({ username: 'maria', password: 'incorrecta' }),
      ).rejects.toMatchObject({ code: USER_ERROR.INVALID_CREDENTIALS });
      await expect(
        other.authRepository.register({ name: 'Otra María', username: 'MARIA', password: 'secreta1' }),
      ).rejects.toMatchObject({ code: USER_ERROR.USERNAME_TAKEN });
    });

    it('el administrador asigna el rol y la persona se entera al instante', async () => {
      const { device, user } = await registerStaff('luis', 'Luis Rojas');
      const events = collect(device.authRepository.subscribe);
      await waitFor(() => isConnected(events), 'la cuenta pendiente se conecta');

      const admin = await adminTablet();
      const listed = await admin.device.userRepository.list();
      expect(listed.find((u) => u.id === user.id)).toMatchObject({ role: null });

      await admin.device.userRepository.setAccess(user.id, { role: ROLES.COOK });

      await waitFor(
        () => events.some((event) => event.type === 'user:updated' && event.user.role === ROLES.COOK),
        'Luis recibe su nuevo rol',
      );
      // Y ya puede ver pedidos sin volver a iniciar sesión.
      expect(await device.orderRepository.list()).toEqual([]);
    });

    it('el administrador ve las altas nuevas sin recargar', async () => {
      const admin = await adminTablet();
      const events = collect(admin.device.userRepository.subscribe);
      await waitFor(() => isConnected(events), 'admin conectado');

      await registerStaff('nueva-persona');

      await waitFor(() => events.some((event) => event.type === 'users:changed'), 'aviso de alta');
    });

    it('solo el administrador puede asignar roles', async () => {
      const cashier = await staffWithRole(ROLES.CASHIER, 'caja1');
      const { user: other } = await registerStaff('otro');

      await expect(
        cashier.device.userRepository.setAccess(other.id, { role: ROLES.ADMIN }),
      ).rejects.toMatchObject({ code: USER_ERROR.FORBIDDEN });
    });

    it('no permite dejar al sistema sin administrador activo', async () => {
      const admin = await adminTablet();
      await expect(
        admin.device.userRepository.setAccess(admin.user.id, { role: ROLES.CASHIER }),
      ).rejects.toMatchObject({ code: USER_ERROR.LAST_ADMIN });
    });

    it('deshabilitar una cuenta cierra su sesión al instante y bloquea el ingreso', async () => {
      const cook = await staffWithRole(ROLES.COOK, 'cocina1');
      const events = collect(cook.device.authRepository.subscribe);
      await waitFor(() => isConnected(events), 'cocinero conectado');

      await cook.admin.device.userRepository.setAccess(cook.user.id, { active: false });

      await waitFor(
        () => events.some((event) => event.type === 'session:expired'),
        'se cierra la sesión del cocinero',
      );
      await expect(
        tablet().authRepository.login({ username: 'cocina1', password: 'secreta1' }),
      ).rejects.toMatchObject({ code: USER_ERROR.ACCOUNT_DISABLED });
    });

    it('cerrar sesión invalida el token', async () => {
      const { device } = await registerStaff('temporal');
      const token = device.session.get();

      await device.authRepository.logout();

      const response = await fetch(`${baseUrl}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      expect(response.status).toBe(401);
    });

    it('limita los intentos de inicio de sesión', async () => {
      await app.close();
      await startApp(0, { max: 3, windowMs: 60_000 });
      const device = tablet();

      for (let i = 0; i < 3; i += 1) {
        await expect(
          device.authRepository.login({ username: 'admin', password: 'mala' }),
        ).rejects.toMatchObject({ code: USER_ERROR.INVALID_CREDENTIALS });
      }
      await expect(
        device.authRepository.login({ username: 'admin', password: 'admin123' }),
      ).rejects.toMatchObject({ code: 'rate_limited' });
    });
  });

  describe('flujo de pedidos', () => {
    it('el pedido enviado por caja aparece en cocina y los cambios llegan a caja', async () => {
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');
      const cocina = await staffWithRole(ROLES.COOK, 'cocina1');
      const cajaEvents = collect(caja.device.orderRepository.subscribe);
      const cocinaEvents = collect(cocina.device.orderRepository.subscribe);
      await waitFor(() => isConnected(cajaEvents) && isConnected(cocinaEvents), 'ambas conectadas');

      const sent = await caja.device.orderService.sendToKitchen(draftFor(caja.user), caja.user);

      await waitFor(
        () => cocinaEvents.some((event) => event.type === 'order:saved' && event.order.id === sent.id),
        'cocina recibe el pedido nuevo',
      );
      const received = cocinaEvents.find((event) => event.type === 'order:saved').order;
      expect(received).toMatchObject({ status: ORDER_STATUS.NEW, number: 1 });
      expect(received.createdBy.id).toBe(caja.user.id);

      await cocina.device.orderService.startPreparation(sent.id, cocina.user);
      await waitFor(
        () => cajaEvents.some((event) => event.order?.status === ORDER_STATUS.IN_PROGRESS),
        'caja ve que cocina empezó',
      );

      await cocina.device.orderService.markReady(sent.id, cocina.user);
      await caja.device.orderService.markDelivered(sent.id, caja.user);
      expect(await cocina.device.orderService.listKitchenOrders()).toHaveLength(0);
    });

    it('cada rol solo puede hacer lo suyo', async () => {
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');
      const cocina = await staffWithRole(ROLES.COOK, 'cocina1');
      const sent = await caja.device.orderService.sendToKitchen(draftFor(caja.user), caja.user);

      // El cajero no puede empezar la preparación aunque firme con su propio usuario.
      const startedBySomeoneElse = changeOrderStatus(sent, ORDER_STATUS.IN_PROGRESS, { user: { ...caja.user, role: ROLES.ADMIN } });
      await expect(caja.device.orderRepository.save(startedBySomeoneElse)).rejects.toMatchObject({
        code: ORDER_ERROR.FORBIDDEN,
      });

      // El cocinero no puede enviar pedidos.
      await expect(
        cocina.device.orderService.sendToKitchen(draftFor(cocina.user), cocina.user),
      ).rejects.toMatchObject({ code: ORDER_ERROR.FORBIDDEN });

      expect((await caja.device.orderRepository.getById(sent.id)).status).toBe(ORDER_STATUS.NEW);
    });

    it('nadie puede firmar un cambio a nombre de otra persona', async () => {
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');
      const cocina = await staffWithRole(ROLES.COOK, 'cocina1');
      const sent = await caja.device.orderService.sendToKitchen(draftFor(caja.user), caja.user);

      // El cocinero fabrica un cambio firmado por el cajero.
      const forged = changeOrderStatus(sent, ORDER_STATUS.CANCELLED, { user: caja.user });
      await expect(cocina.device.orderRepository.save(forged)).rejects.toMatchObject({
        code: ORDER_ERROR.FORBIDDEN,
      });
    });

    it('dos cajas reciben números distintos y consecutivos', async () => {
      const cajaA = await staffWithRole(ROLES.CASHIER, 'caja1');
      const cajaB = await staffWithRole(ROLES.CASHIER, 'caja2');

      const sent = await Promise.all([
        cajaA.device.orderService.sendToKitchen(draftFor(cajaA.user), cajaA.user),
        cajaB.device.orderService.sendToKitchen(draftFor(cajaB.user), cajaB.user),
        cajaA.device.orderService.sendToKitchen(draftFor(cajaA.user), cajaA.user),
      ]);

      expect(sent.map((order) => order.number).sort()).toEqual([1, 2, 3]);
    });

    it('rechaza con conflicto un cambio basado en una copia vieja del pedido', async () => {
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');
      const cocina = await staffWithRole(ROLES.COOK, 'cocina1');
      const sent = await caja.device.orderService.sendToKitchen(draftFor(caja.user), caja.user);

      await cocina.device.orderService.startPreparation(sent.id, cocina.user);

      // La caja todavía tiene en pantalla el pedido como "Nuevo" y lo cancela.
      const stale = changeOrderStatus(sent, ORDER_STATUS.CANCELLED, { user: caja.user });
      await expect(caja.device.orderRepository.save(stale)).rejects.toMatchObject({
        code: ORDER_ERROR.CONFLICT,
      });
      expect((await caja.device.orderRepository.getById(sent.id)).status).toBe(ORDER_STATUS.IN_PROGRESS);
    });

    it('dos cocineros no pueden iniciar el mismo pedido', async () => {
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');
      const cocinaA = await staffWithRole(ROLES.COOK, 'cocina1');
      const cocinaB = await staffWithRole(ROLES.COOK, 'cocina2');
      const sent = await caja.device.orderService.sendToKitchen(draftFor(caja.user), caja.user);

      const results = await Promise.allSettled([
        cocinaA.device.orderService.startPreparation(sent.id, cocinaA.user),
        cocinaB.device.orderService.startPreparation(sent.id, cocinaB.user),
      ]);

      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      const rejected = results.find((result) => result.status === 'rejected');
      expect([ORDER_ERROR.INVALID_TRANSITION, ORDER_ERROR.CONFLICT]).toContain(rejected.reason.code);
    });

    it('reenviar el mismo borrador no duplica el pedido', async () => {
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');
      const draft = draftFor(caja.user);

      const first = await caja.device.orderService.sendToKitchen(draft, caja.user);
      const retry = await caja.device.orderService.sendToKitchen(draft, caja.user);

      expect(retry.id).toBe(first.id);
      expect(retry.number).toBe(first.number);
      expect(await caja.device.orderRepository.list()).toHaveLength(1);
    });

    it('cocina se reconecta sola si el servidor se reinicia y sigue recibiendo pedidos', async () => {
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');
      const cocina = await staffWithRole(ROLES.COOK, 'cocina1');
      const cocinaEvents = collect(cocina.device.orderRepository.subscribe);
      await waitFor(() => isConnected(cocinaEvents), 'cocina conectada');

      // Reinicio del servidor (por ejemplo un despliegue en Render): mismo puerto y mismos datos.
      await app.close();
      await waitFor(() => !isConnected(cocinaEvents), 'cocina detecta la desconexión');
      await startApp(port);
      await waitFor(() => isConnected(cocinaEvents), 'cocina se reconecta con su misma sesión');

      const sent = await caja.device.orderService.sendToKitchen(draftFor(caja.user), caja.user);
      await waitFor(
        () => cocinaEvents.some((event) => event.type === 'order:saved' && event.order.id === sent.id),
        'cocina recibe el pedido tras reconectar',
      );
    });
  });
});
