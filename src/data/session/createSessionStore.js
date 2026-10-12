import { createEventEmitter } from '@/shared/utils/createEventEmitter';

/**
 * Guarda el token de la sesión actual: en memoria para usarlo rápido y en un
 * almacenamiento persistente (`storage`) para que la tablet siga con la sesión
 * iniciada al reabrir la app.
 *
 * @param {{ get: () => Promise<string | null>, set: (token: string) => Promise<void>, remove: () => Promise<void> }} storage
 */
export function createSessionStore({ storage }) {
  let token = null;
  const events = createEventEmitter();

  async function clear() {
    token = null;
    try {
      await storage.remove();
    } catch {
      // Si el almacenamiento falla, igual la sesión en memoria ya quedó cerrada.
    }
  }

  return {
    /** Lee el token guardado (al abrir la app). */
    async load() {
      try {
        token = await storage.get();
      } catch {
        token = null;
      }
      return token;
    },

    /** Token actual en memoria, o null. */
    get: () => token,

    async set(value) {
      token = value;
      await storage.set(value);
    },

    clear,

    /** El servidor rechazó la sesión: se olvida el token y se avisa a la app. */
    async expire() {
      if (token === null) return;
      await clear();
      events.emit({ type: 'session:expired' });
    },

    /** @returns {() => void} */
    subscribe: events.subscribe,
  };
}
