/**
 * Casos de uso de sesión. El usuario nunca elige su rol: se registra o inicia
 * sesión y el administrador le asigna el acceso (ver `userService`).
 *
 * @param {{ authRepository: import('@/data/contracts').AuthRepository }} deps
 */
export function createAuthService({ authRepository }) {
  return {
    /** Recupera la sesión guardada en el dispositivo; null si no hay. */
    restore: () => authRepository.restore(),

    /** Crea una cuenta sin rol y deja la sesión iniciada. */
    register: (input) => authRepository.register(input),

    login: (input) => authRepository.login(input),

    logout: () => authRepository.logout(),

    /** Vuelve a leer la cuenta: úsalo en la pantalla "pendiente de acceso". */
    refresh: () => authRepository.refresh(),

    /**
     * Avisa cuando tu cuenta cambia (te asignaron rol, te deshabilitaron) o la
     * sesión vence. Mantiene viva la conexión en tiempo real mientras esté activo.
     * @param {(event: import('@/data/contracts').AuthEvent) => void} listener
     * @returns {() => void}
     */
    subscribe: (listener) => authRepository.subscribe(listener),
  };
}
