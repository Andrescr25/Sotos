/**
 * Contratos de la capa de datos. La app depende de estas formas, nunca de un
 * backend concreto: se puede cambiar de memoria a servidor escribiendo un
 * adaptador nuevo que cumpla el contrato.
 *
 * ── Pedidos ──────────────────────────────────────────────────────────────
 *
 * @typedef {{ type: 'order:saved', order: import('@/domain/orders/order').Order }} OrderSavedEvent
 *   Un pedido se creó o cambió de estado (en este u otro dispositivo).
 *
 * @typedef {{ type: 'connection', connected: boolean }} ConnectionEvent
 *   Solo adaptadores remotos. Al volver `connected: true` la pantalla debe
 *   recargar sus datos: pudo perder eventos mientras estuvo desconectada.
 *
 * @typedef {OrderSavedEvent | ConnectionEvent} OrderEvent
 *
 * @typedef {Object} OrderRepository
 * @property {(order: import('@/domain/orders/order').Order) => Promise<import('@/domain/orders/order').Order>} save
 *   Guarda un pedido (ver `checkOrderWrite`/`checkOrderActor` para las reglas)
 *   y avisa a los suscriptores. Lanza error con `code` (`invalid_transition`,
 *   `conflict`, `forbidden`...) si se rechaza.
 * @property {(id: string) => Promise<import('@/domain/orders/order').Order | null>} getById
 * @property {(filter?: { statuses?: string[], createdById?: string }) => Promise<import('@/domain/orders/order').Order[]>} list
 *   Más antiguos primero.
 * @property {() => Promise<number>} nextOrderNumber
 *   Consecutivo del día (#001, #002...). Atómico en el servidor.
 * @property {(listener: (event: OrderEvent) => void) => () => void} subscribe
 *   Devuelve la función para cancelar la suscripción.
 *
 * ── Sesión y usuarios ────────────────────────────────────────────────────
 *
 * @typedef {{ type: 'user:updated', user: import('@/domain/users/roles').User }} UserUpdatedEvent
 *   Tu cuenta cambió (el administrador te asignó rol, te deshabilitó...).
 * @typedef {{ type: 'session:expired' }} SessionExpiredEvent
 *   La sesión ya no es válida: hay que volver al login.
 * @typedef {UserUpdatedEvent | SessionExpiredEvent | ConnectionEvent} AuthEvent
 *
 * @typedef {Object} AuthRepository
 * @property {() => Promise<import('@/domain/users/roles').User | null>} restore
 *   Recupera la sesión guardada en el dispositivo (null si no hay o venció).
 * @property {(input: { name: string, username: string, password: string }) => Promise<import('@/domain/users/roles').User>} register
 *   Crea una cuenta SIN rol e inicia sesión. El administrador asigna el rol después.
 * @property {(input: { username: string, password: string }) => Promise<import('@/domain/users/roles').User>} login
 * @property {() => Promise<void>} logout
 * @property {() => Promise<import('@/domain/users/roles').User>} refresh
 *   Vuelve a leer la cuenta (por si el rol cambió).
 * @property {(listener: (event: AuthEvent) => void) => () => void} subscribe
 *
 * @typedef {Object} UserRepository
 * @property {() => Promise<import('@/domain/users/roles').User[]>} list  solo administrador
 * @property {(id: string, changes: { role?: string | null, active?: boolean }) => Promise<import('@/domain/users/roles').User>} setAccess
 *   Asigna rol (o null para quitar el acceso) y/o habilita o deshabilita. Solo administrador.
 * @property {(listener: (event: { type: 'users:changed' } | ConnectionEvent) => void) => () => void} subscribe
 *   Avisa de altas y cambios de cuentas para refrescar la lista.
 *
 * ── Menú ─────────────────────────────────────────────────────────────────
 *
 * @typedef {Object} MenuRepository
 * @property {() => Promise<import('@/domain/menu/types').Menu>} getMenu
 */

export {};
