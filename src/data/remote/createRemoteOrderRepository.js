import { ORDER_ERROR, OrderError } from '@/domain/orders';
import { createEventEmitter } from '@/shared/utils/createEventEmitter';

/**
 * Repositorio de pedidos que habla con el servidor (HTTP + WebSocket).
 * Cumple el contrato `OrderRepository`; la app no sabe si hay red de por medio.
 *
 * Tiempo real: una única conexión WebSocket compartida por todos los
 * suscriptores. Se abre con el primer suscriptor y se cierra con el último.
 * Si se cae (WiFi de la tablet, reinicio del servidor en Render) reintenta con
 * espera creciente y avisa con un evento `connection` para que la pantalla
 * recargue la lista.
 *
 * @param {Object} options
 * @param {string} options.baseUrl  p. ej. "https://sotos.onrender.com"
 * @param {string} [options.apiKey]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {typeof WebSocket} [options.WebSocketImpl]
 * @param {number} [options.reconnectMinMs]
 * @param {number} [options.reconnectMaxMs]
 * @param {number} [options.heartbeatMs]  cada cuánto se envía un ping
 * @param {number} [options.staleMs]  sin mensajes del servidor por este tiempo = conexión muerta
 * @returns {import('@/data/contracts').OrderRepository}
 */
export function createRemoteOrderRepository({
  baseUrl,
  apiKey = '',
  fetchImpl = globalThis.fetch,
  WebSocketImpl = globalThis.WebSocket,
  reconnectMinMs = 1000,
  reconnectMaxMs = 15_000,
  heartbeatMs = 20_000,
  staleMs = 45_000,
}) {
  const root = baseUrl.replace(/\/+$/, '');
  const realtimeUrl = `${root.replace(/^http/, 'ws')}/realtime`;

  // ---------- HTTP ----------

  async function request(method, path, body) {
    let response;
    try {
      response = await fetchImpl(`${root}${path}`, {
        method,
        headers: {
          'x-api-key': apiKey,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new OrderError(ORDER_ERROR.NETWORK, 'No hay conexión con el servidor');
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new OrderError(
        payload?.error?.code ?? `http_${response.status}`,
        payload?.error?.message ?? `El servidor respondió ${response.status}`,
      );
    }
    return payload;
  }

  // ---------- Tiempo real ----------

  const events = createEventEmitter();
  let listenerCount = 0;
  let socket = null;
  let connected = false;
  let attempt = 0;
  let lastMessageAt = 0;
  let reconnectTimer = null;
  let heartbeatTimer = null;

  function setConnected(value) {
    if (connected === value) return;
    connected = value;
    events.emit({ type: 'connection', connected });
  }

  function stopTimers() {
    clearTimeout(reconnectTimer);
    clearInterval(heartbeatTimer);
    reconnectTimer = null;
    heartbeatTimer = null;
  }

  function dropSocket() {
    if (!socket) return;
    const current = socket;
    socket = null;
    current.onopen = current.onmessage = current.onclose = current.onerror = null;
    try {
      current.close();
    } catch {
      // ya estaba cerrado
    }
  }

  function scheduleReconnect() {
    if (listenerCount === 0 || reconnectTimer) return;
    const base = Math.min(reconnectMaxMs, reconnectMinMs * 2 ** attempt);
    const delay = base / 2 + Math.random() * (base / 2); // jitter: evita que todas las tablets reconecten a la vez
    attempt += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  }

  function handleLost() {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    dropSocket();
    setConnected(false);
    scheduleReconnect();
  }

  function connect() {
    if (socket || listenerCount === 0) return;
    const current = new WebSocketImpl(realtimeUrl);
    socket = current;

    current.onopen = () => {
      current.send(JSON.stringify({ type: 'auth', apiKey }));
    };

    current.onmessage = (message) => {
      lastMessageAt = Date.now();
      let data;
      try {
        data = JSON.parse(message.data);
      } catch {
        return;
      }

      if (data.type === 'ready') {
        attempt = 0;
        setConnected(true);
        heartbeatTimer = setInterval(() => {
          if (Date.now() - lastMessageAt > staleMs) {
            handleLost();
            return;
          }
          current.send(JSON.stringify({ type: 'ping' }));
        }, heartbeatMs);
      } else if (data.type === 'order:saved') {
        events.emit({ type: 'order:saved', order: data.order });
      }
    };

    current.onclose = handleLost;
    current.onerror = () => {}; // siempre va seguido de onclose
    lastMessageAt = Date.now();
  }

  function disconnect() {
    stopTimers();
    dropSocket();
    attempt = 0;
    connected = false;
  }

  // ---------- Contrato OrderRepository ----------

  return {
    async save(order) {
      const payload = await request('PUT', `/orders/${encodeURIComponent(order.id)}`, order);
      return payload.order;
    },

    async getById(id) {
      try {
        const payload = await request('GET', `/orders/${encodeURIComponent(id)}`);
        return payload.order;
      } catch (error) {
        if (error instanceof OrderError && error.code === 'order_not_found') return null;
        throw error;
      }
    },

    async list({ statuses, createdById } = {}) {
      const params = new URLSearchParams();
      if (statuses?.length) params.set('statuses', statuses.join(','));
      if (createdById) params.set('createdById', createdById);
      const query = params.toString();
      const payload = await request('GET', `/orders${query ? `?${query}` : ''}`);
      return payload.orders;
    },

    async nextOrderNumber() {
      const payload = await request('POST', '/orders/next-number');
      return payload.number;
    },

    subscribe(listener) {
      const unsubscribeEmitter = events.subscribe(listener);
      listenerCount += 1;
      connect();

      let active = true;
      return () => {
        if (!active) return;
        active = false;
        unsubscribeEmitter();
        listenerCount -= 1;
        if (listenerCount === 0) disconnect();
      };
    },
  };
}
