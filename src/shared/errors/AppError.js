/**
 * Códigos de error que no pertenecen a un módulo de negocio concreto.
 * Los errores de pedidos y de usuarios viven en su propio dominio.
 */
export const COMMON_ERROR = Object.freeze({
  /** No se pudo contactar al servidor (sin WiFi, servidor caído...). */
  NETWORK: 'network',
  /** No hay sesión o ya no es válida. */
  UNAUTHORIZED: 'unauthorized',
  /** Hay sesión pero el rol no permite la acción. */
  FORBIDDEN: 'forbidden',
  RATE_LIMITED: 'rate_limited',
  INTERNAL: 'internal',
});

/**
 * Error esperado de la aplicación: lleva un `code` estable que la interfaz usa
 * para decidir qué mensaje mostrar (el `message` es solo para desarrolladores).
 */
export class AppError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}
