let counter = 0;

/**
 * Genera un id único en el cliente (sin depender de la red).
 * Un adaptador de backend puede reemplazarlo por el id que asigne el servidor.
 * @param {string} [prefix]
 * @returns {string}
 */
export function createId(prefix = 'id') {
  counter = (counter + 1) % 1_000_000;
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}_${random}`;
}
