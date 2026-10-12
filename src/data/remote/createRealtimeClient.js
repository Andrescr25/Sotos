import { createEventEmitter } from '@/shared/utils/createEventEmitter';

/** El servidor cerró la conexión porque el token no es válido o la cuenta fue deshabilitada. */
const REJECTED_CODES = [4401, 4403];

/**
 * Canal de tiempo real con el servidor (WebSocket). Una única conexión
 * compartida por todos los suscriptores: se abre con el primero y se cierra
 * con el último. Solo se conecta si hay sesión iniciada.
 *
 * Eventos que entrega (además de los que envía el servidor):
 *   { type: 'connection', connected }   cambios de estado de la conexión
 *   { type: 'order:saved', order }      un pedido cambió
 *   { type: 'user:updated', user }      tu rol/estado cambió (y al reconectar, tu estado actual)
 *   { type: 'users:changed' }           solo administradores: alta o cambio de cuentas
 *
 * Si la conexión se cae (WiFi de la tablet, reinicio del servidor en Render)
 * reintenta con espera creciente. Al volver a conectar la pantalla debe
 * recargar sus datos: pudo perder eventos.
 *
 * @param {Object} options
 * @param {string} options.baseUrl
 * @param {ReturnType<import('@/data/session/createSessionStore').createSessionStore>} options.session
 * @param {typeof WebSocket} [options.WebSocketImpl]
 * @param {number} [options.reconnectMinMs]
 * @param {number} [options.reconnectMaxMs]
 * @param {number} [options.heartbeatMs]  cada cuánto se envía un ping
 * @param {number} [options.staleMs]  sin mensajes del servidor por este tiempo = conexión muerta
 */
export function createRealtimeClient({
  baseUrl,
  session,
  WebSocketImpl = globalThis.WebSocket,
  reconnectMinMs = 1000,
  reconnectMaxMs = 15_000,
  heartbeatMs = 20_000,
  staleMs = 45_000,
}) {
  const url = `${baseUrl.replace(/\/+$/, '').replace(/^http/, 'ws')}/realtime`;
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

  /**
   * El servidor no acepta este token: la sesión terminó. No se reintenta.
   * Solo si ese token sigue siendo el de la sesión actual: si la persona ya
   * inició una sesión nueva en este dispositivo, el cierre de la vieja no debe
   * llevarse a la nueva.
   */
  function handleRejected(rejectedToken) {
    if (session.get() !== rejectedToken) {
      handleLost(); // se reconecta con el token vigente
      return;
    }
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    dropSocket();
    setConnected(false);
    session.expire();
  }

  function connect() {
    const token = session.get();
    if (socket || listenerCount === 0 || !token) return;

    const current = new WebSocketImpl(url);
    socket = current;
    lastMessageAt = Date.now();

    current.onopen = () => {
      current.send(JSON.stringify({ type: 'auth', token }));
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
        // Al (re)conectar se recibe el estado actual de la cuenta: pudo
        // cambiar mientras no había conexión.
        if (data.user) events.emit({ type: 'user:updated', user: data.user });
        heartbeatTimer = setInterval(() => {
          if (Date.now() - lastMessageAt > staleMs) {
            handleLost();
            return;
          }
          current.send(JSON.stringify({ type: 'ping' }));
        }, heartbeatMs);
      } else if (data.type !== 'pong') {
        events.emit(data);
      }
    };

    current.onclose = (event) => {
      if (REJECTED_CODES.includes(event?.code)) handleRejected(token);
      else handleLost();
    };
    current.onerror = () => {}; // siempre va seguido de onclose
  }

  function disconnect() {
    clearTimeout(reconnectTimer);
    clearInterval(heartbeatTimer);
    reconnectTimer = null;
    heartbeatTimer = null;
    dropSocket();
    attempt = 0;
    connected = false;
  }

  return {
    /**
     * @param {(event: object) => void} listener
     * @returns {() => void} cancelar suscripción
     */
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
