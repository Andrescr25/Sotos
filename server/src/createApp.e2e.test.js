import WebSocket from 'ws';
import { createHttpClient } from '@/data/remote/createHttpClient';
import { createRealtimeClient } from '@/data/remote/createRealtimeClient';
import { createRemoteAccountRepositories } from '@/data/remote/createRemoteAccountRepositories';
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
import { MENU_ERROR } from '@/domain/menu';
import { ROLES, USER_ERROR } from '@/domain/users';
import { createOrderService } from '@/services/orderService';
import { createApp } from './createApp';
import { createMemoryMenuStore } from './store/createMemoryMenuStore';
import { createMemoryStore } from './store/createMemoryStore';
import { createMemoryUserStore } from './store/createMemoryUserStore';

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
  let app;
  let port;
  let baseUrl;
  const cleanups = [];

  const startApp = async (listenPort = 0, loginRateLimit = { max: 1000, windowMs: 60_000 }) => {
    app = createApp({
      orderStore,
      userStore,
      menuStore,
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
    return {
      session,
      http,
      ...accounts,
      orderRepository,
      menuRepository,
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
      const sent = await caja.device.orderService.sendToKitchen(draft, caja.user);

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

    it('el pedido debe llevar nombre del cliente y cocina lo recibe', async () => {
      const caja = await staffWithRole(ROLES.CASHIER, 'caja1');
      const cocina = await staffWithRole(ROLES.COOK, 'cocina1');
      const cocinaEvents = collect(cocina.device.orderRepository.subscribe);
      await waitFor(() => isConnected(cocinaEvents), 'cocina conectada');

      // Sin nombre no sale de Caja (lo frena el dominio).
      await expect(
        caja.device.orderService.sendToKitchen(draftFor(caja.user, ''), caja.user),
      ).rejects.toMatchObject({ code: ORDER_ERROR.CUSTOMER_NAME_REQUIRED });

      // Un cliente que se salte esa regla tampoco logra guardarlo en el servidor.
      const forged = {
        ...sendOrderToKitchen(draftFor(caja.user), { number: 1, user: caja.user }),
        customerName: '',
      };
      await expect(caja.device.orderRepository.save(forged)).rejects.toMatchObject({
        code: ORDER_ERROR.CUSTOMER_NAME_REQUIRED,
      });

      const sent = await caja.device.orderService.sendToKitchen(draftFor(caja.user, 'Ana Mora'), caja.user);
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
