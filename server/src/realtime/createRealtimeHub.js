import { WebSocketServer } from 'ws';
import { PERMISSIONS, can } from '@/domain/users';

/**
 * Canal de tiempo real: las tablets se conectan por WebSocket y reciben los
 * eventos que les corresponden según su rol.
 *
 * Protocolo (JSON):
 *   cliente  -> { type: 'auth', token }        primer mensaje, obligatorio
 *   servidor -> { type: 'ready', user }        autenticado
 *   cliente  -> { type: 'ping' }               el servidor responde { type: 'pong' }
 *   servidor -> { type: 'order:saved', order } solo a quien puede ver pedidos
 *   servidor -> { type: 'user:updated', user } a la persona afectada (rol o estado cambió)
 *   servidor -> { type: 'users:changed' }      a los administradores (alta o cambio de cuentas)
 *   servidor -> { type: 'menu:changed' }       a quien puede ver el menú (el administrador lo editó)
 *
 * Una cuenta sin rol puede conectarse (para enterarse al instante cuando el
 * administrador le da acceso) pero no recibe pedidos.
 *
 * Además usa ping/pong del protocolo para descartar conexiones muertas
 * (Render recomienda keepalive; una tablet que pierde WiFi no avisa).
 *
 * @param {Object} options
 * @param {(token: unknown) => Promise<import('@/domain/users/roles').User | null>} options.authenticate
 * @param {number} [options.heartbeatMs]
 * @param {number} [options.authTimeoutMs]
 */
export function createRealtimeHub({ authenticate, heartbeatMs = 25_000, authTimeoutMs = 5_000 }) {
  const wss = new WebSocketServer({ noServer: true });
  /** Sockets ya autenticados; `socket.user` guarda la última versión del usuario. */
  const authenticated = new Set();

  const send = (socket, message) => {
    if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
  };

  const sendWhere = (predicate, message) => {
    authenticated.forEach((socket) => {
      if (predicate(socket.user)) send(socket, message);
    });
  };

  wss.on('connection', (socket) => {
    socket.isAlive = true;
    socket.authenticating = false;
    socket.on('pong', () => {
      socket.isAlive = true;
    });

    const authTimer = setTimeout(() => socket.close(4401, 'auth timeout'), authTimeoutMs);

    socket.on('message', async (raw) => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (!socket.user) {
        if (socket.authenticating) return;
        if (message?.type !== 'auth') {
          socket.close(4401, 'unauthorized');
          return;
        }

        socket.authenticating = true;
        let user = null;
        try {
          user = await authenticate(message.token);
        } catch {
          user = null;
        }
        if (socket.readyState !== socket.OPEN) return;
        if (!user) {
          socket.close(4401, 'unauthorized');
          return;
        }

        clearTimeout(authTimer);
        socket.user = user;
        authenticated.add(socket);
        send(socket, { type: 'ready', user });
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

    /** Un pedido se creó o cambió: lo reciben quienes pueden ver pedidos. */
    broadcastOrder(order) {
      sendWhere((user) => can(user.role, PERMISSIONS.ORDER_VIEW), { type: 'order:saved', order });
    },

    /**
     * El rol o el estado de una cuenta cambió: se actualiza la conexión y se
     * avisa a esa persona. Si quedó deshabilitada se le cierra la conexión.
     */
    notifyUserUpdated(user) {
      authenticated.forEach((socket) => {
        if (socket.user.id !== user.id) return;
        socket.user = user;
        send(socket, { type: 'user:updated', user });
        if (!user.active) socket.close(4403, 'disabled');
      });
    },

    /**
     * Cierra todas las conexiones de una cuenta (por ejemplo, tras cambiar su
     * contraseña): los dispositivos con la sesión anterior vuelven al login.
     */
    disconnectUser(userId) {
      authenticated.forEach((socket) => {
        if (socket.user.id === userId) socket.close(4401, 'session replaced');
      });
    },

    /** El administrador cambió el menú: caja y administración lo recargan. */
    broadcastMenuChanged() {
      sendWhere((user) => can(user.role, PERMISSIONS.MENU_VIEW), { type: 'menu:changed' });
    },

    /** Hubo un alta o un cambio de cuentas: los administradores recargan su lista. */
    notifyUsersChanged() {
      sendWhere((user) => can(user.role, PERMISSIONS.USER_MANAGE), { type: 'users:changed' });
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
