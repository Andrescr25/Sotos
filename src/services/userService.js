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
