import { createMemoryTokenStorage } from '@/data/session/createMemoryTokenStorage';
import { createSessionStore } from '@/data/session/createSessionStore';
import { AppError, COMMON_ERROR } from '@/shared/errors/AppError';
import { createHttpClient } from './createHttpClient';
import { createRealtimeClient } from './createRealtimeClient';

class FakeWebSocket {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.sent = [];
    this.closed = false;
    FakeWebSocket.instances.push(this);
  }

  send(data) {
    this.sent.push(JSON.parse(data));
  }

  close() {
    this.closed = true;
  }

  // Ayudas de prueba: simulan lo que haría el servidor o la red.
  serverReady(user = { id: 'u1', role: 'cook' }) {
    this.onopen?.();
    this.onmessage?.({ data: JSON.stringify({ type: 'ready', user }) });
  }

  serverSends(message) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }

  networkDrops() {
    this.onclose?.({});
  }

  serverCloses(code) {
    this.onclose?.({ code });
  }
}

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

async function sessionWith(token) {
  const session = createSessionStore({ storage: createMemoryTokenStorage() });
  if (token) await session.set(token);
  return session;
}

beforeEach(() => {
  FakeWebSocket.instances = [];
  jest.spyOn(Math, 'random').mockReturnValue(1);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('cliente HTTP', () => {
  it('envía el token de sesión y devuelve el cuerpo', async () => {
    const session = await sessionWith('tok123');
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(200, { orders: [] }));
    const http = createHttpClient({ baseUrl: 'https://sotos.example.com/', session, fetchImpl });

    expect(await http.get('/orders')).toEqual({ orders: [] });

    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://sotos.example.com/orders');
    expect(options.headers.Authorization).toBe('Bearer tok123');
  });

  it('login y registro no envían token ni expiran la sesión con un 401', async () => {
    const session = await sessionWith('tok123');
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(jsonResponse(401, { error: { code: 'invalid_credentials', message: 'mal' } }));
    const http = createHttpClient({ baseUrl: 'https://x.test', session, fetchImpl });

    await expect(
      http.post('/auth/login', { username: 'a', password: 'b' }, { authenticated: false }),
    ).rejects.toMatchObject({ code: 'invalid_credentials' });

    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(session.get()).toBe('tok123');
  });

  it('un 401 con token expira la sesión y avisa a la app', async () => {
    const session = await sessionWith('tok123');
    const expired = jest.fn();
    session.subscribe(expired);
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(jsonResponse(401, { error: { code: 'unauthorized', message: 'vencida' } }));
    const http = createHttpClient({ baseUrl: 'https://x.test', session, fetchImpl });

    await expect(http.get('/orders')).rejects.toMatchObject({ code: COMMON_ERROR.UNAUTHORIZED });

    expect(session.get()).toBeNull();
    expect(expired).toHaveBeenCalledWith({ type: 'session:expired' });
  });

  it('convierte los errores del servidor en AppError con su código', async () => {
    const session = await sessionWith('t');
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(jsonResponse(409, { error: { code: 'conflict', message: 'cambió' } }));
    const http = createHttpClient({ baseUrl: 'https://x.test', session, fetchImpl });

    const error = await http.put('/orders/a', {}).catch((caught) => caught);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ code: 'conflict', message: 'cambió' });
  });

  it('informa NETWORK cuando no hay conexión', async () => {
    const session = await sessionWith('t');
    const fetchImpl = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    const http = createHttpClient({ baseUrl: 'https://x.test', session, fetchImpl });

    await expect(http.get('/orders')).rejects.toMatchObject({ code: COMMON_ERROR.NETWORK });
    expect(session.get()).toBe('t');
  });
});

describe('cliente de tiempo real', () => {
  async function createClient(overrides = {}) {
    const session = await sessionWith('tok123');
    jest.useFakeTimers();
    const realtime = createRealtimeClient({
      baseUrl: 'https://sotos.example.com/',
      session,
      WebSocketImpl: FakeWebSocket,
      reconnectMinMs: 100,
      reconnectMaxMs: 1000,
      heartbeatMs: 1000,
      staleMs: 3000,
      ...overrides,
    });
    return { realtime, session };
  }

  it('no se conecta sin sesión', async () => {
    const session = await sessionWith(null);
    const realtime = createRealtimeClient({ baseUrl: 'https://x.test', session, WebSocketImpl: FakeWebSocket });

    const unsubscribe = realtime.subscribe(() => {});

    expect(FakeWebSocket.instances).toHaveLength(0);
    unsubscribe();
  });

  it('comparte una conexión, autentica con el token y reenvía eventos', async () => {
    const { realtime } = await createClient();
    const first = [];
    const second = [];
    const stopFirst = realtime.subscribe((event) => first.push(event));
    const stopSecond = realtime.subscribe((event) => second.push(event));

    expect(FakeWebSocket.instances).toHaveLength(1);
    const socket = FakeWebSocket.instances[0];
    expect(socket.url).toBe('wss://sotos.example.com/realtime');

    socket.serverReady({ id: 'u1', role: 'cook' });
    expect(socket.sent[0]).toEqual({ type: 'auth', token: 'tok123' });
    expect(first).toEqual([
      { type: 'connection', connected: true },
      { type: 'user:updated', user: { id: 'u1', role: 'cook' } },
    ]);

    socket.serverSends({ type: 'order:saved', order: { id: 'a1' } });
    expect(second.at(-1)).toEqual({ type: 'order:saved', order: { id: 'a1' } });

    stopFirst();
    expect(socket.closed).toBe(false);
    stopSecond();
    expect(socket.closed).toBe(true);
  });

  it('se reconecta con espera cuando la conexión se cae y avisa el cambio', async () => {
    const { realtime } = await createClient();
    const events = [];
    const unsubscribe = realtime.subscribe((event) => events.push(event));
    FakeWebSocket.instances[0].serverReady();

    FakeWebSocket.instances[0].networkDrops();
    expect(events.at(-1)).toEqual({ type: 'connection', connected: false });
    expect(FakeWebSocket.instances).toHaveLength(1);

    jest.advanceTimersByTime(100);
    expect(FakeWebSocket.instances).toHaveLength(2);

    FakeWebSocket.instances[1].serverReady();
    expect(events.filter((event) => event.type === 'connection').at(-1)).toEqual({
      type: 'connection',
      connected: true,
    });
    unsubscribe();
  });

  it('aumenta la espera entre reintentos y la reinicia al conectar', async () => {
    const { realtime } = await createClient();
    const unsubscribe = realtime.subscribe(() => {});

    FakeWebSocket.instances[0].networkDrops(); // espera 100
    jest.advanceTimersByTime(100);
    FakeWebSocket.instances[1].networkDrops(); // espera 200
    jest.advanceTimersByTime(199);
    expect(FakeWebSocket.instances).toHaveLength(2);
    jest.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(3);

    FakeWebSocket.instances[2].serverReady();
    FakeWebSocket.instances[2].networkDrops(); // vuelve a esperar 100
    jest.advanceTimersByTime(100);
    expect(FakeWebSocket.instances).toHaveLength(4);
    unsubscribe();
  });

  it('detecta una conexión muerta (sin mensajes del servidor) y reconecta', async () => {
    const { realtime } = await createClient();
    const events = [];
    const unsubscribe = realtime.subscribe((event) => events.push(event));
    const socket = FakeWebSocket.instances[0];
    socket.serverReady();

    // El servidor deja de contestar: ni "pong" ni nada. No hay evento de cierre.
    jest.advanceTimersByTime(3000);
    jest.advanceTimersByTime(1000);

    expect(socket.closed).toBe(true);
    expect(events.filter((event) => event.type === 'connection').at(-1)).toEqual({
      type: 'connection',
      connected: false,
    });

    jest.advanceTimersByTime(100);
    expect(FakeWebSocket.instances).toHaveLength(2);
    unsubscribe();
  });

  it('si el servidor rechaza la sesión (4401) la expira y no reintenta', async () => {
    const { realtime, session } = await createClient();
    const expired = jest.fn();
    session.subscribe(expired);
    const unsubscribe = realtime.subscribe(() => {});

    FakeWebSocket.instances[0].serverCloses(4401);
    await jest.advanceTimersByTimeAsync(0); // deja correr la expiración, que es asíncrona

    expect(expired).toHaveBeenCalledWith({ type: 'session:expired' });
    jest.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
    unsubscribe();
  });

  it('no reintenta cuando ya no queda nadie suscrito', async () => {
    const { realtime } = await createClient();
    const unsubscribe = realtime.subscribe(() => {});
    FakeWebSocket.instances[0].networkDrops();
    unsubscribe();

    jest.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});
