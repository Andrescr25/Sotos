/**
 * Contrato del almacén de pedidos del servidor. Hay dos implementaciones:
 * createPostgresStore (producción) y createMemoryStore (desarrollo y pruebas).
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
 */

export {};
