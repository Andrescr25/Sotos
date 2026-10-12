import { WebSocketServer } from 'ws';

/**
 * Canal de tiempo real: las tablets se conectan por WebSocket y reciben cada
 * evento que se hace `broadcast`.
 *
 * Protocolo (JSON):
 *   cliente -> { type: 'auth', apiKey }     primer mensaje, obligatorio
 *   servidor -> { type: 'ready' }           autenticado
 *   cliente -> { type: 'ping' }             el servidor responde { type: 'pong' }
 *   servidor -> { type: 'order:saved', order }
 *
 * Además usa ping/pong del protocolo para descartar conexiones muertas
 * (Render recomienda keepalive; una tablet que pierde WiFi no avisa).
 *
 * @param {Object} options
 * @param {(provided: unknown) => boolean} options.isAuthorized
 * @param {number} [options.heartbeatMs]
 * @param {number} [options.authTimeoutMs]
 */
export function createRealtimeHub({ isAuthorized, heartbeatMs = 25_000, authTimeoutMs = 5_000 }) {
  const wss = new WebSocketServer({ noServer: true });
  const authenticated = new Set();

  const send = (socket, message) => {
    if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
  };

  wss.on('connection', (socket) => {
    socket.isAlive = true;
    socket.on('pong', () => {
      socket.isAlive = true;
    });

    const authTimer = setTimeout(() => socket.close(4401, 'auth timeout'), authTimeoutMs);

    socket.on('message', (raw) => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (!authenticated.has(socket)) {
        if (message?.type === 'auth' && isAuthorized(message.apiKey)) {
          clearTimeout(authTimer);
          authenticated.add(socket);
          send(socket, { type: 'ready' });
        } else {
          socket.close(4401, 'unauthorized');
        }
        return;
      }

      if (message?.type === 'ping') send(socket, { type: 'pong' });
    });

    socket.on('close', () => {
      clearTimeout(authTimer);
      authenticated.delete(socket);
    });
    socket.on('error', () => socket.terminate());
  });

  const heartbeat = setInterval(() => {
    wss.clients.forEach((socket) => {
      if (!socket.isAlive) {
        socket.terminate();
        return;
      }
      socket.isAlive = false;
      socket.ping();
    });
  }, heartbeatMs);
  heartbeat.unref?.();

  return {
    handleUpgrade(req, socket, head) {
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
    },

    broadcast(event) {
      authenticated.forEach((socket) => send(socket, event));
    },

    get clientCount() {
      return authenticated.size;
    },

    close() {
      clearInterval(heartbeat);
      wss.clients.forEach((socket) => socket.close(1001, 'server shutting down'));
      return new Promise((resolve) => wss.close(() => resolve()));
    },
  };
}
