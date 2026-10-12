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
 * @typedef {Object} NewUserRecord
 * @property {string} id
 * @property {string} username
 * @property {string} name
 * @property {string} passwordHash
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
 * @property {() => Promise<number>} countUsers
 * @property {() => Promise<boolean>} hasAdmin
 * @property {(session: { tokenHash: string, userId: string, createdAt: string, expiresAt: string }) => Promise<void>} createSession
 * @property {(tokenHash: string) => Promise<{ userId: string, expiresAt: string } | null>} getSession
 * @property {(tokenHash: string) => Promise<void>} deleteSession
 * @property {(userId: string) => Promise<void>} deleteSessionsOfUser
 * @property {() => Promise<void>} close
 */

export {};
