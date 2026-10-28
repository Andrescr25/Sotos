import WebSocket from 'ws';
import { createHttpClient } from '@/data/remote/createHttpClient';
import { createRealtimeClient } from '@/data/remote/createRealtimeClient';
import { createRemoteAccountRepositories } from '@/data/remote/createRemoteAccountRepositories';
import { createRemoteCashClosingRepository } from '@/data/remote/createRemoteCashClosingRepository';
import { createRemoteInventoryRepository } from '@/data/remote/createRemoteInventoryRepository';
import { createRemoteMenuRepository } from '@/data/remote/createRemoteMenuRepository';
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
  sendOrderToKitchen,
  setCustomerName,
} from '@/domain/orders';
import { CASH_CLOSING_ERROR } from '@/domain/cashClosing';
import { INVENTORY_ERROR, RECIPE_KIND } from '@/domain/inventory';
import { MENU_ERROR } from '@/domain/menu';
import { PAYMENT_ERROR, PAYMENT_METHOD } from '@/domain/payments';
import { ROLES, USER_ERROR } from '@/domain/users';
import { createCashClosingService } from '@/services/cashClosingService';
import { createInventoryService } from '@/services/inventoryService';
import { createOrderService } from '@/services/orderService';
import { createApp } from './createApp';
import { createMemoryCashStore } from './store/createMemoryCashStore';
import { createMemoryInventoryStore } from './store/createMemoryInventoryStore';
import { createMemoryMenuStore } from './store/createMemoryMenuStore';
import { createMemoryStore } from './store/createMemoryStore';
import { createMemoryUserStore } from './store/createMemoryUserStore';

/** Cobro con tarjeta: no necesita monto. */
const PAYMENT = { method: PAYMENT_METHOD.CARD };

function draftFor(user, customerName = 'María Pérez') {
  return addItem(
    setCustomerName(createDraftOrder({ createdBy: user }), customerName),
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
  let menuStore;
  let cashStore;
  let inventoryStore;
  let app;
  let port;
  let baseUrl;
  const cleanups = [];

  const startApp = async (listenPort = 0, loginRateLimit = { max: 1000, windowMs: 60_000 }) => {
    app = createApp({
      orderStore,
      userStore,
      menuStore,
      cashStore,
      inventoryStore,
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
    const menuRepository = createRemoteMenuRepository({ http, realtime });
    const cashClosingRepository = createRemoteCashClosingRepository({ http });
    const inventoryRepository = createRemoteInventoryRepository({ http, realtime });
    return {
      session,
      http,
      ...accounts,
      orderRepository,
      menuRepository,
      cashClosingRepository,
      inventoryRepository,
      inventoryService: createInventoryService({ inventoryRepository }),
      orderService: createOrderService({ orderRepository }),
      cashClosingService: createCashClosingService({ cashClosingRepository }),
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

  /** Tablet del administrador inicial, con sesión iniciada. */
  async function adminTablet() {
    const device = tablet();
    const user = await device.authRepository.login({ username: 'admin', password: 'admin123' });
    return { device, user };
  }

  /**
   * Da de alta a una persona como en la vida real: el administrador crea la
   * cuenta (sin rol, o con el indicado) y la persona crea su contraseña
   * ('secreta1') con el enlace, en su propia tablet.
   */
  async function registerStaff(username, name = username, role = null) {
    const admin = await adminTablet();
    const { invitation } = await admin.device.userRepository.createAccount({ name, username, role });
    const device = tablet();
    const user = await device.authRepository.acceptInvitation(invitation.token, 'secreta1');
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
    menuStore = createMemoryMenuStore();
    cashStore = createMemoryCashStore({ orderStore });
    inventoryStore = createMemoryInventoryStore();
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

    it('CORS: la app web local puede iniciar sesión; un sitio ajeno no', async () => {
      const preflight = (origin) =>
        fetch(`${baseUrl}/auth/login`, {
          method: 'OPTIONS',
          headers: {
            Origin: origin,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'content-type',
          },
        });

      const local = await preflight('http://localhost:8081');
      expect(local.status).toBe(204);
      expect(local.headers.get('access-control-allow-origin')).toBe('http://localhost:8081');
      expect(local.headers.get('access-control-allow-headers')).toMatch(/Authorization/);
      // El navegador exige que el método esté permitido: la app usa todos estos.
      ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].forEach((method) =>
        expect(local.headers.get('access-control-allow-methods')).toContain(method),
      );

      const foreign = await preflight('https://sitio-malicioso.example');
      expect(foreign.status).toBe(404);
      expect(foreign.headers.get('access-control-allow-origin')).toBeNull();

      // La respuesta real también lleva la cabecera, o el navegador la descarta.
      const login = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { Origin: 'http://localhost:8081', 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' }),
      });
      expect(login.status).toBe(200);
      expect(login.headers.get('access-control-allow-origin')).toBe('http://localhost:8081');
    });

    it('la raíz del servidor confirma que está activo (no es un error al abrirla en un navegador)', async () => {
      const response = await fetch(`${baseUrl}/`);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ service: 'sotos-server', status: 'ok' });
    });

    it('no existe el registro abierto: crear una cuenta propia no es posible', async () => {
      const response = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Intruso', username: 'intruso', password: 'secreta1' }),
      });
      expect(response.status).toBe(404);

      await expect(
        tablet().authRepository.login({ username: 'intruso', password: 'secreta1' }),
      ).rejects.toMatchObject({ code: USER_ERROR.INVALID_CREDENTIALS });
    });

    it('una cuenta invitada sin rol queda SIN acceso: no ve pedidos ni usuarios', async () => {
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
      const admin = await adminTablet();
      await expect(
        admin.device.userRepository.createAccount({ name: 'Otra María', username: 'MARIA', role: null }),
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

    it('otro administrador ve las altas nuevas sin recargar', async () => {
      const watcher = await adminTablet();
      const events = collect(watcher.device.userRepository.subscribe);
      await waitFor(() => isConnected(events), 'admin conectado');

      const other = await adminTablet();
      await other.device.userRepository.createAccount({ name: 'Nueva Persona', username: 'nueva-persona' });

      await waitFor(() => events.some((event) => event.type === 'users:changed'), 'aviso de alta');
    });

    it('invitación completa: el admin crea al empleado, el empleado crea su contraseña y entra con su rol', async () => {
      const admin = await adminTablet();
      const { user, invitation } = await admin.device.userRepository.createAccount({
        name: 'Luis Rojas',
        username: 'luis',
        role: ROLES.COOK,
      });
      expect(user).toMatchObject({ role: ROLES.COOK, passwordSet: false });

      // El empleado abre el enlace en su propio dispositivo.
      const employee = tablet();
      expect(await employee.authRepository.getInvitation(invitation.token)).toMatchObject({
        name: 'Luis Rojas',
        role: ROLES.COOK,
        isReset: false,
      });
      const signedIn = await employee.authRepository.acceptInvitation(invitation.token, 'clave-segura');

      expect(signedIn).toMatchObject({ username: 'luis', role: ROLES.COOK, passwordSet: true });
      // Ya tiene acceso sin que nadie haga nada más: ve pedidos...
      expect(await employee.orderRepository.list()).toEqual([]);
      // ...y puede volver a entrar con su usuario y contraseña.
      const later = tablet();
      expect(await later.authRepository.login({ username: 'luis', password: 'clave-segura' })).toMatchObject({
        role: ROLES.COOK,
      });
    });

    it('la invitación aparece en la lista del admin y desaparece al crear la contraseña', async () => {
      const admin = await adminTablet();
      const events = collect(admin.device.userRepository.subscribe);
      await waitFor(() => isConnected(events), 'admin conectado');

      const { invitation } = await admin.device.userRepository.createAccount({
        name: 'Luis Rojas',
        username: 'luis',
        role: ROLES.CASHIER,
      });
      let listed = (await admin.device.userRepository.list()).find((u) => u.username === 'luis');
      expect(listed.passwordSet).toBe(false);

      events.length = 0;
      await tablet().authRepository.acceptInvitation(invitation.token, 'clave-segura');

      await waitFor(() => events.some((event) => event.type === 'users:changed'), 'aviso al admin');
      listed = (await admin.device.userRepository.list()).find((u) => u.username === 'luis');
      expect(listed.passwordSet).toBe(true);
    });

    it('el enlace sirve una sola vez y uno inventado no sirve', async () => {
      const admin = await adminTablet();
      const { invitation } = await admin.device.userRepository.createAccount({
        name: 'Luis Rojas',
        username: 'luis',
        role: ROLES.CASHIER,
      });
      await tablet().authRepository.acceptInvitation(invitation.token, 'clave-segura');

      const intruder = tablet();
      await expect(intruder.authRepository.acceptInvitation(invitation.token, 'otra-clave')).rejects.toMatchObject({
        code: USER_ERROR.INVITATION_USED,
      });
      await expect(intruder.authRepository.getInvitation('inventado')).rejects.toMatchObject({
        code: USER_ERROR.INVITATION_INVALID,
      });
      await expect(intruder.authRepository.acceptInvitation('inventado', 'clave-segura')).rejects.toMatchObject({
        code: USER_ERROR.INVITATION_INVALID,
      });
    });

    it('la cuenta invitada no puede entrar con usuario y contraseña hasta crearla', async () => {
      const admin = await adminTablet();
      await admin.device.userRepository.createAccount({ name: 'Luis Rojas', username: 'luis', role: ROLES.COOK });

      await expect(
        tablet().authRepository.login({ username: 'luis', password: 'clave-segura' }),
      ).rejects.toMatchObject({ code: USER_ERROR.INVALID_CREDENTIALS });
    });

    it('solo el administrador crea cuentas y genera enlaces', async () => {
      const cashier = await staffWithRole(ROLES.CASHIER, 'caja1');
      const { user: other } = await registerStaff('otro');

      await expect(
        cashier.device.userRepository.createAccount({ name: 'Intruso', username: 'intruso', role: ROLES.ADMIN }),
      ).rejects.toMatchObject({ code: USER_ERROR.FORBIDDEN });
      await expect(cashier.device.userRepository.createInvitation(other.id)).rejects.toMatchObject({
        code: USER_ERROR.FORBIDDEN,
      });
    });

    it('restablecer contraseña: la sesión anterior se cierra al instante y la nueva sirve', async () => {
      const staff = await staffWithRole(ROLES.CASHIER, 'caja1');
      const events = collect(staff.device.authRepository.subscribe);
      await waitFor(() => isConnected(events), 'caja conectada');

      const { invitation } = await staff.admin.device.userRepository.createInvitation(staff.user.id);
      const fresh = tablet();
      expect(await fresh.authRepository.getInvitation(invitation.token)).toMatchObject({ isReset: true });
      await fresh.authRepository.acceptInvitation(invitation.token, 'nueva-clave-1');

      await waitFor(() => events.some((event) => event.type === 'session:expired'), 'sesión anterior cerrada');
      await expect(
        tablet().authRepository.login({ username: 'caja1', password: 'secreta1' }),
      ).rejects.toMatchObject({ code: USER_ERROR.INVALID_CREDENTIALS });
      await expect(
        tablet().authRepository.login({ username: 'caja1', password: 'nueva-clave-1' }),
      ).resolves.toMatchObject({ role: ROLES.CASHIER });
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

  describe('menú', () => {
    it('empieza vacío y quien tiene acceso a Caja puede leerlo', async () => {
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');
      const menu = await caja.device.menuRepository.getMenu();
      expect(menu).toEqual({ categories: [], products: [], extras: [], quickNotes: [] });
    });

    it('el administrador arma el menú y Caja lo recibe en vivo', async () => {
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');
      const events = collect(caja.device.menuRepository.subscribe);
      await waitFor(() => isConnected(events), 'caja conectada');

      const admin = await adminTablet();
      const repo = admin.device.menuRepository;
      const category = await repo.create('categories', { name: 'Platillos', icon: 'restaurant' });
      const extra = await repo.create('extras', { name: 'Queso extra', price: 500 });
      const product = await repo.create('products', {
        categoryId: category.id,
        name: 'Casado',
        kind: 'dish',
        price: 3500,
        extraIds: [extra.id],
      });

      expect(product.menu.products[0]).toMatchObject({ name: 'Casado', price: 3500, extraIds: [extra.id] });
      await waitFor(
        () => events.filter((event) => event.type === 'menu:changed').length >= 3,
        'caja recibe los avisos de cambio',
      );

      const seenByCashier = await caja.device.menuRepository.getMenu();
      expect(seenByCashier.products.map((p) => p.name)).toEqual(['Casado']);
      expect(seenByCashier.extras.map((e) => e.name)).toEqual(['Queso extra']);
    });

    it('solo el administrador puede modificar el menú', async () => {
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');
      const cocina = await staffWithRole(ROLES.COOK, 'cocina1');

      await expect(
        caja.device.menuRepository.create('categories', { name: 'Intento' }),
      ).rejects.toMatchObject({ code: MENU_ERROR.FORBIDDEN });
      await expect(caja.device.menuRepository.loadSample()).rejects.toMatchObject({
        code: MENU_ERROR.FORBIDDEN,
      });
      // Cocina no necesita el menú: no lo ve.
      await expect(cocina.device.menuRepository.getMenu()).rejects.toMatchObject({
        code: MENU_ERROR.FORBIDDEN,
      });
    });

    it('el servidor aplica las reglas del dominio (códigos de error claros)', async () => {
      const admin = await adminTablet();
      const repo = admin.device.menuRepository;
      const category = await repo.create('categories', { name: 'Platillos' });

      await expect(repo.create('categories', { name: 'platillos' })).rejects.toMatchObject({
        code: MENU_ERROR.DUPLICATE_NAME,
      });
      await expect(
        repo.create('products', { categoryId: category.id, name: 'Casado', kind: 'dish', price: 12.5 }),
      ).rejects.toMatchObject({ code: MENU_ERROR.INVALID_PRICE });
      await expect(
        repo.create('products', { categoryId: 'no-existe', name: 'Casado', kind: 'dish', price: 100 }),
      ).rejects.toMatchObject({ code: MENU_ERROR.CATEGORY_NOT_FOUND });
      await expect(repo.update('products', 'no-existe', { price: 1 })).rejects.toMatchObject({
        code: MENU_ERROR.PRODUCT_NOT_FOUND,
      });
    });

    it('edita, ordena y elimina; una categoría con productos no se elimina', async () => {
      const admin = await adminTablet();
      const repo = admin.device.menuRepository;
      const category = await repo.create('categories', { name: 'Platillos' });
      const a = await repo.create('products', { categoryId: category.id, name: 'Arroz', kind: 'dish', price: 1000 });
      const b = await repo.create('products', { categoryId: category.id, name: 'Pollo', kind: 'dish', price: 2000 });

      let menu = await repo.update('products', a.id, { price: 1500, active: false });
      expect(menu.products.find((p) => p.id === a.id)).toMatchObject({ price: 1500, active: false });

      menu = await repo.move('products', b.id, 'up');
      const byOrder = [...menu.products].sort((x, y) => x.sortOrder - y.sortOrder).map((p) => p.name);
      expect(byOrder).toEqual(['Pollo', 'Arroz']);

      await expect(repo.remove('categories', category.id)).rejects.toMatchObject({
        code: MENU_ERROR.CATEGORY_NOT_EMPTY,
      });

      await repo.remove('products', a.id);
      await repo.remove('products', b.id);
      menu = await repo.remove('categories', category.id);
      expect(menu.categories).toEqual([]);
    });

    it('observaciones frecuentes: agregar y quitar (con tildes y espacios)', async () => {
      const admin = await adminTablet();
      const repo = admin.device.menuRepository;

      let menu = await repo.addQuickNote('Término medio');
      menu = await repo.addQuickNote('Sin cebolla & ajo');
      expect(menu.quickNotes).toEqual(['Término medio', 'Sin cebolla & ajo']);

      menu = await repo.removeQuickNote('Sin cebolla & ajo');
      expect(menu.quickNotes).toEqual(['Término medio']);
    });

    it('menú de ejemplo: solo se carga con el menú vacío', async () => {
      const admin = await adminTablet();
      const repo = admin.device.menuRepository;

      const loaded = await repo.loadSample();
      expect(loaded.products.length).toBeGreaterThan(0);

      await expect(repo.loadSample()).rejects.toMatchObject({ code: MENU_ERROR.MENU_NOT_EMPTY });
    });

    it('cambiar el menú no altera pedidos ya enviados', async () => {
      const admin = await adminTablet();
      const repo = admin.device.menuRepository;
      const category = await repo.create('categories', { name: 'Platillos' });
      const created = await repo.create('products', {
        categoryId: category.id,
        name: 'Casado',
        kind: 'dish',
        price: 3500,
      });
      const product = created.menu.products[0];

      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');
      const draft = addItem(
        setCustomerName(createDraftOrder({ createdBy: caja.user }), 'Luis Rojas'),
        createOrderItem({ product, quantity: 2 }),
      );
      const sent = await caja.device.orderService.sendToKitchen(draft, caja.user, PAYMENT);

      await repo.update('products', product.id, { name: 'Casado nuevo', price: 9999 });
      await repo.remove('products', product.id);

      const stored = await caja.device.orderRepository.getById(sent.id);
      expect(stored.items[0]).toMatchObject({ name: 'Casado', unitPrice: 3500 });
      expect(stored.totals.total).toBe(7000);
    });
  });

  describe('flujo de pedidos', () => {
    it('el pedido enviado por caja aparece en cocina y los cambios llegan a caja', async () => {
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');
      const cocina = await staffWithRole(ROLES.COOK, 'cocina1');
      const cajaEvents = collect(caja.device.orderRepository.subscribe);
      const cocinaEvents = collect(cocina.device.orderRepository.subscribe);
      await waitFor(() => isConnected(cajaEvents) && isConnected(cocinaEvents), 'ambas conectadas');

      const sent = await caja.device.orderService.sendToKitchen(draftFor(caja.user), caja.user, PAYMENT);

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

    it('el pedido debe llevar nombre del cliente y cocina lo recibe', async () => {
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');
      const cocina = await staffWithRole(ROLES.COOK, 'cocina1');
      const cocinaEvents = collect(cocina.device.orderRepository.subscribe);
      await waitFor(() => isConnected(cocinaEvents), 'cocina conectada');

      // Sin nombre no sale de Caja (lo frena el dominio).
      await expect(
        caja.device.orderService.sendToKitchen(draftFor(caja.user, ''), caja.user, PAYMENT),
      ).rejects.toMatchObject({ code: ORDER_ERROR.CUSTOMER_NAME_REQUIRED });

      // Un cliente que se salte esa regla tampoco logra guardarlo en el servidor.
      const forged = {
        ...sendOrderToKitchen(draftFor(caja.user), { number: 1, user: caja.user, payment: PAYMENT }),
        customerName: '',
      };
      await expect(caja.device.orderRepository.save(forged)).rejects.toMatchObject({
        code: ORDER_ERROR.CUSTOMER_NAME_REQUIRED,
      });

      const sent = await caja.device.orderService.sendToKitchen(draftFor(caja.user, 'Ana Mora'), caja.user, PAYMENT);
      expect(sent.customerName).toBe('Ana Mora');
      await waitFor(
        () => cocinaEvents.some((event) => event.type === 'order:saved' && event.order.id === sent.id),
        'cocina recibe el pedido',
      );
      expect(cocinaEvents.find((event) => event.type === 'order:saved').order.customerName).toBe('Ana Mora');
    });

    it('cada rol solo puede hacer lo suyo', async () => {
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');
      const cocina = await staffWithRole(ROLES.COOK, 'cocina1');
      const sent = await caja.device.orderService.sendToKitchen(draftFor(caja.user), caja.user, PAYMENT);

      // El cajero no puede empezar la preparación aunque firme con su propio usuario.
      const startedBySomeoneElse = changeOrderStatus(sent, ORDER_STATUS.IN_PROGRESS, { user: { ...caja.user, role: ROLES.ADMIN } });
      await expect(caja.device.orderRepository.save(startedBySomeoneElse)).rejects.toMatchObject({
        code: ORDER_ERROR.FORBIDDEN,
      });

      // El cocinero no puede enviar pedidos.
      await expect(
        cocina.device.orderService.sendToKitchen(draftFor(cocina.user), cocina.user, PAYMENT),
      ).rejects.toMatchObject({ code: ORDER_ERROR.FORBIDDEN });

      expect((await caja.device.orderRepository.getById(sent.id)).status).toBe(ORDER_STATUS.NEW);
    });

    it('nadie puede firmar un cambio a nombre de otra persona', async () => {
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');
      const cocina = await staffWithRole(ROLES.COOK, 'cocina1');
      const sent = await caja.device.orderService.sendToKitchen(draftFor(caja.user), caja.user, PAYMENT);

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
        cajaA.device.orderService.sendToKitchen(draftFor(cajaA.user), cajaA.user, PAYMENT),
        cajaB.device.orderService.sendToKitchen(draftFor(cajaB.user), cajaB.user, PAYMENT),
        cajaA.device.orderService.sendToKitchen(draftFor(cajaA.user), cajaA.user, PAYMENT),
      ]);

      expect(sent.map((order) => order.number).sort()).toEqual([1, 2, 3]);
    });

    it('rechaza con conflicto un cambio basado en una copia vieja del pedido', async () => {
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');
      const cocina = await staffWithRole(ROLES.COOK, 'cocina1');
      const sent = await caja.device.orderService.sendToKitchen(draftFor(caja.user), caja.user, PAYMENT);

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
      const sent = await caja.device.orderService.sendToKitchen(draftFor(caja.user), caja.user, PAYMENT);

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

      const first = await caja.device.orderService.sendToKitchen(draft, caja.user, PAYMENT);
      const retry = await caja.device.orderService.sendToKitchen(draft, caja.user, PAYMENT);

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

      const sent = await caja.device.orderService.sendToKitchen(draftFor(caja.user), caja.user, PAYMENT);
      await waitFor(
        () => cocinaEvents.some((event) => event.type === 'order:saved' && event.order.id === sent.id),
        'cocina recibe el pedido tras reconectar',
      );
    });
  });

  describe('cobro antes de cocina', () => {
    it('sin pago confirmado el pedido no entra, ni aunque una tablet se salte la regla', async () => {
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');

      // La tablet misma lo frena: el dominio exige el pago.
      await expect(
        caja.device.orderService.sendToKitchen(draftFor(caja.user), caja.user),
      ).rejects.toMatchObject({ code: ORDER_ERROR.PAYMENT_REQUIRED });

      // Una tablet modificada manda el pedido directo al servidor, sin pago o con uno que no cuadra.
      const paid = sendOrderToKitchen(draftFor(caja.user), { number: 1, user: caja.user, payment: PAYMENT });
      const forgeries = [
        { ...paid, payment: null },
        { ...paid, payment: { ...paid.payment, amount: 1, tendered: 1 } },
        { ...paid, payment: { ...paid.payment, method: PAYMENT_METHOD.CASH, tendered: paid.payment.amount + 5_000, change: 0 } },
      ];
      for (const forged of forgeries) {
        await expect(caja.device.orderRepository.save(forged)).rejects.toMatchObject({
          code: ORDER_ERROR.PAYMENT_REQUIRED,
        });
      }
      expect(await caja.device.orderRepository.list()).toHaveLength(0);
    });

    it('en efectivo guarda lo que entregó el cliente y el vuelto', async () => {
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');

      const sent = await caja.device.orderService.sendToKitchen(draftFor(caja.user), caja.user, {
        method: PAYMENT_METHOD.CASH,
        tendered: 20_000,
      });

      expect(sent.payment).toMatchObject({
        method: 'cash',
        amount: sent.totals.total,
        tendered: 20_000,
        change: 20_000 - sent.totals.total,
        receivedBy: { id: caja.user.id },
      });
      const stored = await caja.device.orderRepository.getById(sent.id);
      expect(stored.payment).toEqual(sent.payment);
    });

    it('un efectivo que no alcanza se rechaza sin gastar el número del pedido', async () => {
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');

      await expect(
        caja.device.orderService.sendToKitchen(draftFor(caja.user), caja.user, {
          method: PAYMENT_METHOD.CASH,
          tendered: 100,
        }),
      ).rejects.toMatchObject({ code: PAYMENT_ERROR.INSUFFICIENT });

      const sent = await caja.device.orderService.sendToKitchen(draftFor(caja.user), caja.user, PAYMENT);
      expect(sent.number).toBe(1);
    });

    it('nadie registra un pago a nombre de otra persona', async () => {
      const cajaA = await staffWithRole(ROLES.CASHIER, 'caja1');
      const cajaB = await staffWithRole(ROLES.CASHIER, 'caja2');

      // La caja B envía un pedido cuyo pago dice que lo recibió la caja A.
      const order = sendOrderToKitchen(draftFor(cajaB.user), { number: 1, user: cajaB.user, payment: PAYMENT });
      const forged = { ...order, payment: { ...order.payment, receivedBy: { id: cajaA.user.id, name: cajaA.user.name } } };

      await expect(cajaB.device.orderRepository.save(forged)).rejects.toMatchObject({
        code: ORDER_ERROR.FORBIDDEN,
      });
    });

    it('el cambio de estado en cocina no altera el pago, y no se puede reescribir', async () => {
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');
      const cocina = await staffWithRole(ROLES.COOK, 'cocina1');
      const sent = await caja.device.orderService.sendToKitchen(draftFor(caja.user), caja.user, PAYMENT);

      const started = await cocina.device.orderService.startPreparation(sent.id, cocina.user);
      expect(started.payment).toEqual(sent.payment);

      const rewritten = changeOrderStatus(started, ORDER_STATUS.READY, { user: cocina.user });
      await expect(
        cocina.device.orderRepository.save({
          ...rewritten,
          payment: { ...started.payment, method: PAYMENT_METHOD.CASH, tendered: started.payment.amount + 1, change: 1 },
        }),
      ).rejects.toMatchObject({ code: ORDER_ERROR.INVALID_ORDER });
    });
  });

  describe('cierre de caja', () => {
    /** Una caja que cobra un pedido en efectivo (₡20.000, con vuelto) y otro por SINPE Móvil. */
    async function cashierWithSales() {
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');
      const cash = await caja.device.orderService.sendToKitchen(draftFor(caja.user), caja.user, {
        method: PAYMENT_METHOD.CASH,
        tendered: 20_000,
      });
      const sinpe = await caja.device.orderService.sendToKitchen(draftFor(caja.user), caja.user, {
        method: PAYMENT_METHOD.SINPE,
      });
      return { caja, cash, sinpe };
    }

    const closingInput = (service, overrides = {}) => ({
      id: service.newClosingId(),
      openingFloat: 10_000,
      countedCash: 17_000,
      note: '',
      ...overrides,
    });

    it('el cajero ve lo cobrado, cierra con lo contado y el siguiente cierre arranca en cero', async () => {
      const { caja, cash, sinpe } = await cashierWithSales();
      const service = caja.device.cashClosingService;

      const pending = await service.getPending();
      expect(pending).toMatchObject({ closable: true, suggestedOpeningFloat: 0, lastClosing: null });
      expect(pending.sales.total).toBe(cash.totals.total + sinpe.totals.total);

      // Esperado: fondo ₡10.000 + efectivo cobrado (el vuelto no cuenta).
      const expected = 10_000 + cash.totals.total;
      const closing = await service.close(closingInput(service, { countedCash: expected - 500, note: 'Falta una moneda' }));

      expect(closing).toMatchObject({
        number: 1,
        closedBy: { id: caja.user.id },
        sales: {
          orderCount: 2,
          total: cash.totals.total + sinpe.totals.total,
          byMethod: {
            cash: { count: 1, total: cash.totals.total },
            card: { count: 0, total: 0 },
            sinpe: { count: 1, total: sinpe.totals.total },
          },
        },
        cash: { openingFloat: 10_000, cashSales: cash.totals.total, expected, counted: expected - 500, difference: -500 },
        note: 'Falta una moneda',
      });

      const after = await service.getPending();
      expect(after).toMatchObject({ closable: false, suggestedOpeningFloat: expected - 500, lastClosing: { number: 1 } });
      expect(after.sales.orderCount).toBe(0);
      expect((await service.listClosings()).map((item) => item.number)).toEqual([1]);
    });

    it('cada pedido entra en un solo cierre: los cobrados después van al siguiente', async () => {
      const { caja } = await cashierWithSales();
      const service = caja.device.cashClosingService;
      await service.close(closingInput(service));

      await caja.device.orderService.sendToKitchen(draftFor(caja.user), caja.user, PAYMENT);
      const second = await service.close(closingInput(service, { openingFloat: 0, countedCash: 0 }));

      expect(second).toMatchObject({ number: 2, sales: { orderCount: 1 } });
      expect((await service.listClosings()).map((item) => item.number)).toEqual([2, 1]);
    });

    it('el servidor calcula los totales: lo que mande la tablet aparte de lo contado no cuenta', async () => {
      const { caja, cash, sinpe } = await cashierWithSales();

      const closing = await caja.device.cashClosingRepository.close({
        ...closingInput(caja.device.cashClosingService),
        sales: { total: 1 },
        cash: { cashSales: 999_999, expected: 999_999 },
      });

      expect(closing.sales.total).toBe(cash.totals.total + sinpe.totals.total);
      expect(closing.cash.cashSales).toBe(cash.totals.total);
    });

    it('reintentar el cierre con el mismo identificador no lo duplica', async () => {
      const { caja } = await cashierWithSales();
      const service = caja.device.cashClosingService;
      const input = closingInput(service);

      const first = await service.close(input);
      const retry = await service.close(input);

      expect(retry).toEqual(first);
      expect(await service.listClosings()).toHaveLength(1);
    });

    it('con dos tablets cerrando a la vez, los pedidos quedan en un solo cierre', async () => {
      const { caja } = await cashierWithSales();
      const otra = await staffWithRole(ROLES.CASHIER, 'caja2');

      const results = await Promise.allSettled([
        caja.device.cashClosingService.close(closingInput(caja.device.cashClosingService)),
        otra.device.cashClosingService.close(closingInput(otra.device.cashClosingService)),
      ]);

      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      expect(results.find((result) => result.status === 'rejected').reason).toMatchObject({
        code: CASH_CLOSING_ERROR.NO_SALES,
      });
      const closings = await caja.device.cashClosingService.listClosings();
      expect(closings).toHaveLength(1);
      expect(closings[0].sales.orderCount).toBe(2);
    });

    it('rechaza cerrar sin ventas y los montos inválidos, sin tocar los pedidos pendientes', async () => {
      const empty = await staffWithRole(ROLES.CASHIER, 'caja0');
      await expect(empty.device.cashClosingService.close(closingInput(empty.device.cashClosingService))).rejects.toMatchObject({
        code: CASH_CLOSING_ERROR.NO_SALES,
      });

      const { caja } = await cashierWithSales();
      const service = caja.device.cashClosingService;
      for (const bad of [{ countedCash: -1 }, { countedCash: 10.5 }, { openingFloat: 'mucho' }, { countedCash: undefined }]) {
        await expect(service.close(closingInput(service, bad))).rejects.toMatchObject({
          code: CASH_CLOSING_ERROR.INVALID_AMOUNT,
        });
      }
      await expect(service.close(closingInput(service, { id: 'con espacios' }))).rejects.toMatchObject({
        code: CASH_CLOSING_ERROR.INVALID_ID,
      });
      expect((await service.getPending()).sales.orderCount).toBe(2);
      expect(await service.listClosings()).toEqual([]);
    });

    it('un pedido cobrado y luego cancelado se informa aparte y no suma a las ventas', async () => {
      const { caja, cash } = await cashierWithSales();
      await caja.device.orderService.cancel(cash.id, caja.user);

      const pending = await caja.device.cashClosingService.getPending();

      expect(pending.sales.orderCount).toBe(1);
      expect(pending.sales.cancelled).toEqual({ count: 1, total: cash.totals.total });
      expect(pending.sales.byMethod.cash.total).toBe(0);
    });

    it('cocina y las cuentas sin rol no pueden ver ni cerrar la caja', async () => {
      await cashierWithSales();
      const cocina = await staffWithRole(ROLES.COOK, 'cocina1');
      const sinRol = await registerStaff('sinrol');

      for (const { device } of [cocina, sinRol]) {
        const service = device.cashClosingService;
        await expect(service.getPending()).rejects.toMatchObject({ code: 'forbidden' });
        await expect(service.listClosings()).rejects.toMatchObject({ code: 'forbidden' });
        await expect(service.close(closingInput(service))).rejects.toMatchObject({ code: 'forbidden' });
      }
      expect(await cashStore.listClosings()).toEqual([]);
    });

    it('el administrador también puede cerrar la caja y ve el historial', async () => {
      await cashierWithSales();
      const admin = await adminTablet();

      const closing = await admin.device.cashClosingService.close(closingInput(admin.device.cashClosingService));

      expect(closing).toMatchObject({ number: 1, closedBy: { id: admin.user.id } });
      expect(await admin.device.cashClosingService.listClosings()).toHaveLength(1);
    });

    it('el servidor responde 409 al cerrar sin ventas', async () => {
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');
      const response = await fetch(`${baseUrl}/cash-closings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${caja.device.session.get()}` },
        body: JSON.stringify({ id: 'cls_x', openingFloat: 0, countedCash: 0 }),
      });

      expect(response.status).toBe(409);
      expect((await response.json()).error.code).toBe(CASH_CLOSING_ERROR.NO_SALES);
    });
  });

  describe('inventario', () => {
    /**
     * El administrador arma un menú mínimo y un inventario: "Papas" (₡1.500) y
     * "Hamburguesa" (₡3.500) con "Queso extra" (₡500); un paquete de papas rinde
     * 8 porciones y un kg de queso, 10.
     */
    async function restaurant() {
      const admin = await adminTablet();
      const menu = admin.device.menuRepository;
      const category = await menu.create('categories', { name: 'Platillos' });
      const queso = await menu.create('extras', { name: 'Queso extra', price: 500 });
      await menu.create('products', { categoryId: category.id, name: 'Papas', kind: 'dish', price: 1500 });
      await menu.create('products', {
        categoryId: category.id, name: 'Hamburguesa', kind: 'dish', price: 3500, extraIds: [queso.id],
      });
      const current = await menu.getMenu();
      const products = Object.fromEntries(current.products.map((product) => [product.name, product]));
      const cheeseExtra = current.extras.find((extra) => extra.id === queso.id);

      const inventory = admin.device.inventoryService;
      const { id: papas } = await inventory.createItem({ name: 'Paquete de papas', unit: 'paquete', portionsPerUnit: 8, stock: 24 });
      const { id: cheese } = await inventory.createItem({ name: 'Queso', unit: 'kg', portionsPerUnit: 10, stock: 30 });
      await inventory.setRecipe(RECIPE_KIND.PRODUCTS, products.Papas.id, [{ itemId: papas, portions: 1 }]);
      await inventory.setRecipe(RECIPE_KIND.PRODUCTS, products.Hamburguesa.id, [
        { itemId: papas, portions: 1 },
        { itemId: cheese, portions: 2 },
      ]);
      await inventory.setRecipe(RECIPE_KIND.EXTRAS, cheeseExtra.id, [{ itemId: cheese, portions: 3 }]);
      return { admin, inventory, products, cheeseExtra, ids: { papas, cheese } };
    }

    const draftOf = (user, items, name = 'Luis Rojas') =>
      items.reduce((order, item) => addItem(order, createOrderItem(item)), setCustomerName(createDraftOrder({ createdBy: user }), name));

    const stock = async (inventory, id) => (await inventory.getInventory()).items.find((item) => item.id === id).stock;

    it('cada venta rebaja del paquete la porción que usa el platillo (1 de 8)', async () => {
      const { inventory, products, ids } = await restaurant();
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');

      await caja.device.orderService.sendToKitchen(draftOf(caja.user, [{ product: products.Papas, quantity: 1 }]), caja.user, PAYMENT);
      expect(await stock(inventory, ids.papas)).toBe(23);

      await caja.device.orderService.sendToKitchen(draftOf(caja.user, [{ product: products.Papas, quantity: 3 }]), caja.user, PAYMENT);
      expect(await stock(inventory, ids.papas)).toBe(20);
    });

    it('descuenta platillos y extras: el extra usa su propia cantidad', async () => {
      const { inventory, products, cheeseExtra, ids } = await restaurant();
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');

      // 2 hamburguesas, solo 1 con queso extra.
      await caja.device.orderService.sendToKitchen(
        draftOf(caja.user, [{ product: products.Hamburguesa, quantity: 2, extras: [{ extra: cheeseExtra, quantity: 1 }] }]),
        caja.user,
        PAYMENT,
      );

      expect(await stock(inventory, ids.papas)).toBe(24 - 2);
      expect(await stock(inventory, ids.cheese)).toBe(30 - (2 * 2 + 3));
    });

    it('un pedido sin recetas no toca el inventario, y vender sin stock no se bloquea', async () => {
      const { admin, inventory, products, ids } = await restaurant();
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');

      await inventory.setRecipe(RECIPE_KIND.PRODUCTS, products.Papas.id, []); // Papas sin receta
      await caja.device.orderService.sendToKitchen(draftOf(caja.user, [{ product: products.Papas, quantity: 4 }]), caja.user, PAYMENT);
      expect(await stock(inventory, ids.papas)).toBe(24);

      await inventory.setRecipe(RECIPE_KIND.PRODUCTS, products.Papas.id, [{ itemId: ids.papas, portions: 1 }]);
      await inventory.adjustStock(ids.papas, { mode: 'set', portions: 1 });
      const sent = await caja.device.orderService.sendToKitchen(draftOf(caja.user, [{ product: products.Papas, quantity: 3 }]), caja.user, PAYMENT);

      expect(sent.status).toBe(ORDER_STATUS.NEW); // la venta salió
      expect(await stock(admin.device.inventoryService, ids.papas)).toBe(-2);
    });

    it('reenviar el mismo pedido o avanzarlo en cocina no vuelve a descontar', async () => {
      const { inventory, products, ids } = await restaurant();
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');
      const cocina = await staffWithRole(ROLES.COOK, 'cocina1');
      const draft = draftOf(caja.user, [{ product: products.Papas, quantity: 2 }]);

      const sent = await caja.device.orderService.sendToKitchen(draft, caja.user, PAYMENT);
      await caja.device.orderService.sendToKitchen(draft, caja.user, PAYMENT); // reintento tras perder la respuesta
      await cocina.device.orderService.startPreparation(sent.id, cocina.user);
      await cocina.device.orderService.markReady(sent.id, cocina.user);
      await caja.device.orderService.markDelivered(sent.id, caja.user);

      expect(await stock(inventory, ids.papas)).toBe(22);
    });

    it('un pedido rechazado (por ejemplo, sin pago) no descuenta nada', async () => {
      const { inventory, products, ids } = await restaurant();
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');
      const paid = sendOrderToKitchen(
        draftOf(caja.user, [{ product: products.Papas, quantity: 2 }]),
        { number: 1, user: caja.user, payment: PAYMENT },
      );

      await expect(caja.device.orderRepository.save({ ...paid, payment: null })).rejects.toMatchObject({
        code: ORDER_ERROR.PAYMENT_REQUIRED,
      });

      expect(await stock(inventory, ids.papas)).toBe(24);
    });

    it('varias cajas vendiendo a la vez: todas las ventas quedan descontadas', async () => {
      const { inventory, products, ids } = await restaurant();
      const cajaA = await staffWithRole(ROLES.CASHIER, 'caja1');
      const cajaB = await staffWithRole(ROLES.CASHIER, 'caja2');
      const sell = (caja) =>
        caja.device.orderService.sendToKitchen(draftOf(caja.user, [{ product: products.Papas, quantity: 1 }]), caja.user, PAYMENT);

      await Promise.all([sell(cajaA), sell(cajaB), sell(cajaA), sell(cajaB), sell(cajaA)]);

      expect(await stock(inventory, ids.papas)).toBe(24 - 5);
    });

    it('el administrador ve el stock cambiar en vivo, por una venta y por un ajuste', async () => {
      const { admin, inventory, products, ids } = await restaurant();
      const events = collect(admin.device.inventoryRepository.subscribe);
      await waitFor(() => isConnected(events), 'administrador conectado');
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');
      const changes = () => events.filter((event) => event.type === 'inventory:changed').length;

      await caja.device.orderService.sendToKitchen(draftOf(caja.user, [{ product: products.Papas, quantity: 1 }]), caja.user, PAYMENT);
      await waitFor(() => changes() === 1, 'aviso por la venta');

      await inventory.adjustStock(ids.papas, { mode: 'add', portions: 8 });
      await waitFor(() => changes() === 2, 'aviso por el ajuste');
    });

    it('solo el administrador ve y edita el inventario; cajero y cocina no, aunque sus ventas sí descuentan', async () => {
      const { products, ids } = await restaurant();
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');
      const cocina = await staffWithRole(ROLES.COOK, 'cocina1');
      const sinRol = await registerStaff('sinrol');

      for (const { device } of [caja, cocina, sinRol]) {
        const service = device.inventoryService;
        await expect(service.getInventory()).rejects.toMatchObject({ code: 'forbidden' });
        await expect(service.createItem({ name: 'Sal', unit: 'kg', portionsPerUnit: 1 })).rejects.toMatchObject({ code: 'forbidden' });
        await expect(service.updateItem(ids.papas, { name: 'Otro' })).rejects.toMatchObject({ code: 'forbidden' });
        await expect(service.deleteItem(ids.papas)).rejects.toMatchObject({ code: 'forbidden' });
        await expect(service.adjustStock(ids.papas, { mode: 'set', portions: 999 })).rejects.toMatchObject({ code: 'forbidden' });
        await expect(service.setRecipe(RECIPE_KIND.PRODUCTS, products.Papas.id, [])).rejects.toMatchObject({ code: 'forbidden' });
      }
      const stored = await inventoryStore.getInventory();
      expect(stored.items.find((item) => item.id === ids.papas)).toMatchObject({ name: 'Paquete de papas', stock: 24 });
    });

    it('el servidor aplica las reglas del dominio con códigos de error claros', async () => {
      const { inventory, products, ids } = await restaurant();

      await expect(inventory.createItem({ name: 'paquete de PAPAS', unit: 'paquete', portionsPerUnit: 8 })).rejects.toMatchObject({
        code: INVENTORY_ERROR.DUPLICATE_NAME,
      });
      await expect(inventory.createItem({ name: 'Sal', unit: 'kg', portionsPerUnit: 0 })).rejects.toMatchObject({
        code: INVENTORY_ERROR.INVALID_PORTIONS,
      });
      await expect(inventory.adjustStock(ids.papas, { mode: 'set', portions: -4 })).rejects.toMatchObject({
        code: INVENTORY_ERROR.INVALID_AMOUNT,
      });
      await expect(inventory.updateItem('no-existe', { name: 'X' })).rejects.toMatchObject({
        code: INVENTORY_ERROR.ITEM_NOT_FOUND,
      });
      await expect(
        inventory.setRecipe(RECIPE_KIND.PRODUCTS, products.Papas.id, [{ itemId: ids.papas, portions: 0 }]),
      ).rejects.toMatchObject({ code: INVENTORY_ERROR.INVALID_RECIPE });
    });

    it('una receta solo puede apuntar a un producto o extra que exista en el menú', async () => {
      const { admin, inventory, ids } = await restaurant();

      await expect(
        inventory.setRecipe(RECIPE_KIND.PRODUCTS, 'prod-fantasma', [{ itemId: ids.papas, portions: 1 }]),
      ).rejects.toMatchObject({ code: 'product_not_found' });
      await expect(
        inventory.setRecipe(RECIPE_KIND.EXTRAS, 'extra-fantasma', [{ itemId: ids.papas, portions: 1 }]),
      ).rejects.toMatchObject({ code: 'extra_not_found' });

      // Una receta de un producto que ya se borró del menú sí se puede quitar.
      const { id } = await admin.device.menuRepository.create('products', {
        categoryId: (await admin.device.menuRepository.getMenu()).categories[0].id,
        name: 'Temporal', kind: 'dish', price: 100,
      });
      await inventory.setRecipe(RECIPE_KIND.PRODUCTS, id, [{ itemId: ids.papas, portions: 1 }]);
      await admin.device.menuRepository.remove('products', id);
      const cleaned = await inventory.setRecipe(RECIPE_KIND.PRODUCTS, id, []);
      expect(cleaned.recipes.products[id]).toBeUndefined();
    });

    it('eliminar un insumo lo quita de las recetas y las ventas siguientes ya no lo usan', async () => {
      const { inventory, products, ids } = await restaurant();
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');

      const after = await inventory.deleteItem(ids.cheese);
      expect(after.recipes.products[products.Hamburguesa.id]).toEqual([{ itemId: ids.papas, portions: 1 }]);

      await caja.device.orderService.sendToKitchen(draftOf(caja.user, [{ product: products.Hamburguesa, quantity: 1 }]), caja.user, PAYMENT);
      expect(await stock(inventory, ids.papas)).toBe(23);
    });
  });
});
