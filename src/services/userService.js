/**
 * Casos de uso de administración de cuentas (solo rol administrador; el
 * servidor lo verifica en cada llamada).
 *
 * @param {{ userRepository: import('@/data/contracts').UserRepository }} deps
 */
export function createUserService({ userRepository }) {
  return {
    list: () => userRepository.list(),

    /** Asigna el rol; `null` quita el acceso. */
    assignRole: (userId, role) => userRepository.setAccess(userId, { role }),

    /**
     * Crea la cuenta de un empleado y devuelve su enlace de invitación (un solo
     * uso). El empleado lo abre y crea su contraseña; entra con el rol dado.
     */
    createAccount: (input) => userRepository.createAccount(input),

    /**
     * Enlace nuevo para una cuenta existente: invitación perdida o contraseña
     * olvidada. El enlace anterior deja de servir.
     */
    createInvitation: (userId) => userRepository.createInvitation(userId),

    /** Habilita o deshabilita la cuenta (deshabilitada no puede entrar). */
    setActive: (userId, active) => userRepository.setAccess(userId, { active }),

    /**
     * Avisa cuando hay un alta o un cambio de cuentas para refrescar la lista.
     * @param {(event: object) => void} listener
     * @returns {() => void}
     */
    subscribe: (listener) => userRepository.subscribe(listener),
  };
}
