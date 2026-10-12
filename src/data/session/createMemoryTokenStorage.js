/** Almacenamiento en memoria: pruebas y modo sin servidor. No persiste. */
export function createMemoryTokenStorage() {
  let value = null;
  return {
    async get() {
      return value;
    },
    async set(token) {
      value = token;
    },
    async remove() {
      value = null;
    },
  };
}
