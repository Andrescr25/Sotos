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
 * @typedef {Object} InvitationInfo
 * @property {string} name
 * @property {string} username
 * @property {'cashier' | 'cook' | 'admin' | null} role
 * @property {boolean} isReset  true = ya tenía contraseña (restablecimiento)
 * @property {string} expiresAt
 *
 * @typedef {Object} InvitationIssued
 * @property {string} token  se muestra una sola vez; el servidor solo guarda su hash
 * @property {string} expiresAt
 *
 * @typedef {Object} AuthRepository
 * @property {() => Promise<import('@/domain/users/roles').User | null>} restore
 *   Recupera la sesión guardada en el dispositivo (null si no hay o venció).
 * @property {(input: { username: string, password: string }) => Promise<import('@/domain/users/roles').User>} login
 * @property {() => Promise<void>} logout
 * @property {() => Promise<import('@/domain/users/roles').User>} refresh
 *   Vuelve a leer la cuenta (por si el rol cambió).
 * @property {(token: string) => Promise<InvitationInfo>} getInvitation
 *   Qué cuenta es la del enlace, antes de crear la contraseña. Lanza error con
 *   `code` `invitation_invalid` / `invitation_expired` / `invitation_used`.
 * @property {(token: string, password: string) => Promise<import('@/domain/users/roles').User>} acceptInvitation
 *   Crea la contraseña con el enlace y deja la sesión abierta.
 * @property {(listener: (event: AuthEvent) => void) => () => void} subscribe
 *
 * @typedef {Object} UserRepository
 * @property {() => Promise<import('@/domain/users/roles').User[]>} list  solo administrador
 * @property {(id: string, changes: { role?: string | null, active?: boolean }) => Promise<import('@/domain/users/roles').User>} setAccess
 *   Asigna rol (o null para quitar el acceso) y/o habilita o deshabilita. Solo administrador.
 * @property {(input: { name: string, username: string, role?: string | null }) => Promise<{ user: import('@/domain/users/roles').User, invitation: InvitationIssued }>} createAccount
 *   El administrador crea la cuenta de un empleado y obtiene su enlace. Solo administrador.
 * @property {(userId: string) => Promise<{ user: import('@/domain/users/roles').User, invitation: InvitationIssued }>} createInvitation
 *   Enlace nuevo para una cuenta existente (invitación perdida o contraseña
 *   olvidada); el enlace anterior deja de servir. Solo administrador.
 * @property {(listener: (event: { type: 'users:changed' } | ConnectionEvent) => void) => () => void} subscribe
 *   Avisa de altas y cambios de cuentas para refrescar la lista.
 *
 * ── Menú ─────────────────────────────────────────────────────────────────
 *
 * @typedef {'categories' | 'products' | 'extras'} MenuCollection
 *
 * @typedef {Object} MenuRepository
 * @property {() => Promise<import('@/domain/menu/types').Menu>} getMenu
 *   Quien tiene acceso a Caja o Administración.
 * @property {(collection: MenuCollection, input: object) => Promise<{ menu: import('@/domain/menu/types').Menu, id: string }>} create
 *   Solo administrador. Aplica las reglas de `@/domain/menu` (MenuError con `code`).
 * @property {(collection: MenuCollection, id: string, patch: object) => Promise<import('@/domain/menu/types').Menu>} update
 * @property {(collection: MenuCollection, id: string) => Promise<import('@/domain/menu/types').Menu>} remove
 * @property {(collection: MenuCollection, id: string, direction: 'up' | 'down') => Promise<import('@/domain/menu/types').Menu>} move
 * @property {(text: string) => Promise<import('@/domain/menu/types').Menu>} addQuickNote
 * @property {(text: string) => Promise<import('@/domain/menu/types').Menu>} removeQuickNote
 * @property {() => Promise<import('@/domain/menu/types').Menu>} loadSample
 *   Carga el menú de ejemplo; solo si el menú está vacío.
 * @property {(listener: (event: { type: 'menu:changed' } | ConnectionEvent) => void) => () => void} subscribe
 *   Avisa cuando el administrador cambia el menú (en este u otro dispositivo).
 */

export {};
