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

    login: (input) => authRepository.login(input),

    logout: () => authRepository.logout(),

    /** Vuelve a leer la cuenta: úsalo en la pantalla "pendiente de acceso". */
    refresh: () => authRepository.refresh(),

    /** Datos de la cuenta a la que pertenece un enlace de invitación. */
    getInvitation: (token) => authRepository.getInvitation(token),

    /** El empleado crea su contraseña con el enlace y queda con la sesión abierta. */
    acceptInvitation: (token, password) => authRepository.acceptInvitation(token, password),

    /**
     * Avisa cuando tu cuenta cambia (te asignaron rol, te deshabilitaron) o la
     * sesión vence. Mantiene viva la conexión en tiempo real mientras esté activo.
     * @param {(event: import('@/data/contracts').AuthEvent) => void} listener
     * @returns {() => void}
     */
    subscribe: (listener) => authRepository.subscribe(listener),
  };
}
