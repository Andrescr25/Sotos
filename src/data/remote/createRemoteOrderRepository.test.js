import { ORDER_ERROR, OrderError } from '@/domain/orders';
import { createRemoteOrderRepository } from './createRemoteOrderRepository';

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

  // Ayudas de prueba: simulan lo que haría el servidor/red.
  serverReady() {
    this.onopen?.();
    this.onmessage?.({ data: JSON.stringify({ type: 'ready' }) });
  }

  serverSends(message) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }

  networkDrops() {
    this.onclose?.();
  }
}

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

function createRepository(overrides = {}) {
  return createRemoteOrderRepository({
    baseUrl: 'https://sotos.example.com/',
    apiKey: 'k',
    fetchImpl: jest.fn(),
    WebSocketImpl: FakeWebSocket,
    reconnectMinMs: 100,
    reconnectMaxMs: 1000,
    heartbeatMs: 1000,
    staleMs: 3000,
    ...overrides,
  });
}

beforeEach(() => {
  FakeWebSocket.instances = [];
  jest.useFakeTimers();
  jest.spyOn(Math, 'random').mockReturnValue(1);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('HTTP', () => {
  it('envía la clave y devuelve el pedido guardado', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(200, { order: { id: 'a1' } }));
    const repository = createRepository({ fetchImpl });

    const saved = await repository.save({ id: 'a1' });

    expect(saved).toEqual({ id: 'a1' });
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://sotos.example.com/orders/a1');
    expect(options.method).toBe('PUT');
    expect(options.headers['x-api-key']).toBe('k');
  });

  it('convierte las respuestas de error del servidor en OrderError con su código', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(jsonResponse(409, { error: { code: 'conflict', message: 'cambió en otro dispositivo' } }));
    const repository = createRepository({ fetchImpl });

    await expect(repository.save({ id: 'a1' })).rejects.toMatchObject({
      code: ORDER_ERROR.CONFLICT,
      message: 'cambió en otro dispositivo',
    });
  });

  it('informa NETWORK cuando no hay conexión', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    const repository = createRepository({ fetchImpl });

    const error = await repository.list().catch((caught) => caught);
    expect(error).toBeInstanceOf(OrderError);
    expect(error.code).toBe(ORDER_ERROR.NETWORK);
  });

  it('arma la consulta de list con estados y usuario', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse(200, { orders: [] }));
    const repository = createRepository({ fetchImpl });

    await repository.list({ statuses: ['new', 'ready'], createdById: 'u1' });

    expect(fetchImpl.mock.calls[0][0]).toBe(
      'https://sotos.example.com/orders?statuses=new%2Cready&createdById=u1',
    );
  });
});

describe('tiempo real', () => {
  it('comparte una sola conexión, autentica y reenvía eventos', () => {
    const repository = createRepository();
    const first = [];
    const second = [];
    const unsubscribeFirst = repository.subscribe((event) => first.push(event));
    const unsubscribeSecond = repository.subscribe((event) => second.push(event));

    expect(FakeWebSocket.instances).toHaveLength(1);
    const socket = FakeWebSocket.instances[0];
    expect(socket.url).toBe('wss://sotos.example.com/realtime');

    socket.serverReady();
    expect(socket.sent[0]).toEqual({ type: 'auth', apiKey: 'k' });
    expect(first).toEqual([{ type: 'connection', connected: true }]);

    socket.serverSends({ type: 'order:saved', order: { id: 'a1' } });
    expect(second.at(-1)).toEqual({ type: 'order:saved', order: { id: 'a1' } });

    unsubscribeFirst();
    expect(socket.closed).toBe(false);
    unsubscribeSecond();
    expect(socket.closed).toBe(true);
  });

  it('se reconecta con espera cuando la conexión se cae y avisa el cambio', () => {
    const repository = createRepository();
    const events = [];
    const unsubscribe = repository.subscribe((event) => events.push(event));
    FakeWebSocket.instances[0].serverReady();

    FakeWebSocket.instances[0].networkDrops();
    expect(events.at(-1)).toEqual({ type: 'connection', connected: false });
    expect(FakeWebSocket.instances).toHaveLength(1);

    jest.advanceTimersByTime(100);
    expect(FakeWebSocket.instances).toHaveLength(2);

    FakeWebSocket.instances[1].serverReady();
    expect(events.at(-1)).toEqual({ type: 'connection', connected: true });
    unsubscribe();
  });

  it('aumenta la espera entre reintentos y la reinicia al conectar', () => {
    const repository = createRepository();
    const unsubscribe = repository.subscribe(() => {});

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

  it('detecta una conexión muerta (sin mensajes del servidor) y reconecta', () => {
    const repository = createRepository();
    const events = [];
    const unsubscribe = repository.subscribe((event) => events.push(event));
    const socket = FakeWebSocket.instances[0];
    socket.serverReady();

    // El servidor deja de contestar: ni "pong" ni nada. No hay evento de cierre.
    jest.advanceTimersByTime(3000);
    jest.advanceTimersByTime(1000);

    expect(socket.closed).toBe(true);
    expect(events.at(-1)).toEqual({ type: 'connection', connected: false });

    jest.advanceTimersByTime(100);
    expect(FakeWebSocket.instances).toHaveLength(2);
    unsubscribe();
  });

  it('no reintenta cuando ya no queda nadie suscrito', () => {
    const repository = createRepository();
    const unsubscribe = repository.subscribe(() => {});
    FakeWebSocket.instances[0].networkDrops();
    unsubscribe();

    jest.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});
