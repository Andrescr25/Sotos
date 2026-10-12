/**
 * Contratos de la capa de datos. La app depende de estas formas, nunca de un
 * backend concreto: se puede cambiar de memoria a servidor escribiendo un
 * adaptador nuevo que cumpla el contrato.
 *
 * @typedef {{ type: 'order:saved', order: import('@/domain/orders/order').Order }} OrderSavedEvent
 *   Un pedido se creó o cambió de estado (en este u otro dispositivo).
 *
 * @typedef {{ type: 'connection', connected: boolean }} ConnectionEvent
 *   Solo adaptadores remotos. Al volver `connected: true` la pantalla debe
 *   recargar la lista: pudo perder eventos mientras estuvo desconectada.
 *
 * @typedef {OrderSavedEvent | ConnectionEvent} OrderEvent
 *
 * @typedef {Object} OrderRepository
 * @property {(order: import('@/domain/orders/order').Order) => Promise<import('@/domain/orders/order').Order>} save
 *   Guarda un pedido (ver `checkOrderWrite` para las reglas) y avisa a los
 *   suscriptores. Lanza OrderError (`invalid_transition`, `conflict`...) si se rechaza.
 * @property {(id: string) => Promise<import('@/domain/orders/order').Order | null>} getById
 * @property {(filter?: { statuses?: string[], createdById?: string }) => Promise<import('@/domain/orders/order').Order[]>} list
 *   Más antiguos primero.
 * @property {() => Promise<number>} nextOrderNumber
 *   Consecutivo del día (#001, #002...). Atómico en el servidor.
 * @property {(listener: (event: OrderEvent) => void) => () => void} subscribe
 *   Devuelve la función para cancelar la suscripción.
 *
 * @typedef {Object} MenuRepository
 * @property {() => Promise<import('@/domain/menu/types').Menu>} getMenu
 */

export {};
