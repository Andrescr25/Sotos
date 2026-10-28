/**
 * Contratos de los almacenes del servidor. Cada uno tiene dos
 * implementaciones: Postgres (producción) y memoria (desarrollo y pruebas).
 *
 * @typedef {{ ok: true, order: import('@/domain/orders/order').Order } | { ok: false, code: string, message: string }} SaveResult
 *
 * @typedef {Object} OrderStore
 * @property {() => Promise<void>} init  crea el esquema si no existe
 * @property {(id: string) => Promise<import('@/domain/orders/order').Order | null>} getOrder
 * @property {(filter?: { statuses?: string[], createdById?: string }) => Promise<import('@/domain/orders/order').Order[]>} listOrders
 * @property {(order: import('@/domain/orders/order').Order, check: (existing: import('@/domain/orders/order').Order | null) => import('@/domain/orders/orderIntegrity').WriteVerdict) => Promise<SaveResult>} saveOrder
 *   Evalúa `check` contra el pedido guardado DENTRO de la misma operación
 *   atómica que la escritura (bloqueo de fila en Postgres).
 * @property {(day: string) => Promise<number>} nextOrderNumber  atómico; `day` = "YYYY-MM-DD"
 * @property {() => Promise<void>} close
 *
 * @typedef {Object} CashStore
 * @property {() => Promise<void>} init  crea el esquema si no existe
 * @property {() => Promise<{ orders: import('@/domain/orders/order').Order[], previous: import('@/domain/cashClosing').CashClosing | null }>} getPending
 *   Pedidos con cobro que ningún cierre ha cubierto, y el último cierre.
 * @property {(id: string, build: (pending: { orders: import('@/domain/orders/order').Order[], previous: import('@/domain/cashClosing').CashClosing | null }) => import('@/domain/cashClosing').CashClosing) => Promise<import('@/domain/cashClosing').CashClosing>} createClosing
 *   Atómico y de uno en uno: lee lo pendiente, arma el cierre con `build` y
 *   marca esos pedidos como cubiertos. Si `build` lanza no se guarda nada.
 *   Si ya existe un cierre con ese `id` lo devuelve sin duplicarlo.
 * @property {(options?: { limit?: number }) => Promise<import('@/domain/cashClosing').CashClosing[]>} listClosings
 *   Del más reciente al más antiguo.
 * @property {() => Promise<void>} close
 *
 * @typedef {Object} MenuStore
 * @property {() => Promise<void>} init
 * @property {() => Promise<import('@/domain/menu/types').Menu>} getMenu  vacío si aún no hay menú
 * @property {(apply: (menu: import('@/domain/menu/types').Menu) => import('@/domain/menu/types').Menu) => Promise<import('@/domain/menu/types').Menu>} updateMenu
 *   Aplica un cambio de forma atómica (bloqueo de fila en Postgres). Si `apply`
 *   lanza MenuError no se guarda nada.
 * @property {() => Promise<void>} close
 *
 * @typedef {Object} NewUserRecord
 * @property {string} id
 * @property {string} username
 * @property {string} name
 * @property {string | null} passwordHash  null = cuenta invitada, aún sin contraseña
 * @property {string | null} role
 * @property {boolean} active
 * @property {string} createdAt
 *
 * @typedef {Object} UserStore
 * @property {() => Promise<void>} init
 * @property {(record: NewUserRecord) => Promise<{ ok: true, user: import('@/domain/users/roles').User } | { ok: false, code: string, message: string }>} createUser
 *   Devuelve `username_taken` si el usuario ya existe.
 * @property {(username: string) => Promise<{ user: import('@/domain/users/roles').User, passwordHash: string } | null>} findCredentials
 * @property {(id: string) => Promise<import('@/domain/users/roles').User | null>} getUser
 * @property {() => Promise<import('@/domain/users/roles').User[]>} listUsers
 * @property {(id: string, changes: { role?: string | null, active?: boolean }) => Promise<import('@/domain/users/roles').User>} updateAccess
 *   Aplica `applyAccessChange` de forma atómica; lanza UserError si no procede.
 * @property {(invitation: { tokenHash: string, userId: string, createdById: string | null, createdAt: string, expiresAt: string }) => Promise<void>} createInvitation
 *   Reemplaza cualquier invitación sin usar de esa cuenta: solo el último enlace sirve.
 * @property {(tokenHash: string) => Promise<{ user: import('@/domain/users/roles').User, expiresAt: string, usedAt: string | null } | null>} getInvitation
 * @property {(args: { tokenHash: string, passwordHash: string, now: Date }) => Promise<{ ok: true, user: import('@/domain/users/roles').User } | { ok: false, code: string }>} acceptInvitation
 *   Atómico: valida el enlace, guarda la contraseña, lo marca usado y cierra
 *   las sesiones anteriores de la cuenta.
 * @property {() => Promise<number>} countUsers
 * @property {() => Promise<boolean>} hasAdmin
 * @property {(session: { tokenHash: string, userId: string, createdAt: string, expiresAt: string }) => Promise<void>} createSession
 * @property {(tokenHash: string) => Promise<{ userId: string, expiresAt: string } | null>} getSession
 * @property {(tokenHash: string) => Promise<void>} deleteSession
 * @property {(userId: string) => Promise<void>} deleteSessionsOfUser
 * @property {() => Promise<void>} close
 */

export {};
