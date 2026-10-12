/**
 * Emisor de eventos mínimo. Lo usan los repositorios para avisar cambios
 * (p. ej. "pedido guardado") a quien esté suscrito, como la pantalla de cocina.
 * @template T
 * @returns {{ subscribe: (listener: (event: T) => void) => () => void, emit: (event: T) => void }}
 */
export function createEventEmitter() {
  const listeners = new Set();

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    emit(event) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error en un suscriptor de eventos', error);
        }
      });
    },
  };
}
