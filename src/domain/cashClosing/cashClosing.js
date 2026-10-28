import { PAYMENT_METHOD } from '@/domain/payments';
import { CASH_CLOSING_ERROR, CashClosingError } from './cashClosingErrors';
import { isPaidOrder, summarizeSales } from './salesSummary';

/**
 * Cierre de caja: junta todo lo cobrado desde el cierre anterior y lo cuadra
 * contra el efectivo que realmente hay en el cajón. Todo en colones enteros.
 *
 * Una sola caja: el cierre cubre los cobros de todos los cajeros. Cada pedido
 * cobrado entra en exactamente un cierre (el almacén lo garantiza).
 *
 * @typedef {Object} CashClosing
 * @property {string} id
 * @property {number} number  consecutivo: 1, 2, 3...
 * @property {string} closedAt  fecha ISO
 * @property {{ id: string, name: string }} closedBy
 * @property {string | null} periodStart  cierre anterior o, si es el primero, el primer cobro
 * @property {import('./salesSummary').SalesSummary} sales
 * @property {Object} cash
 * @property {number} cash.openingFloat  efectivo con el que arrancó la caja
 * @property {number} cash.cashSales  cobrado en efectivo
 * @property {number} cash.expected  `openingFloat + cashSales`: lo que debería haber
 * @property {number} cash.counted  lo que se contó en el cajón
 * @property {number} cash.difference  `counted - expected`: positivo sobra, negativo falta
 * @property {string} note
 *
 * @typedef {Object} CashPending  lo que está por cerrarse
 * @property {import('./salesSummary').SalesSummary} sales
 * @property {string | null} since  desde cuándo (cierre anterior o primer cobro)
 * @property {number} suggestedOpeningFloat  lo que quedó contado en el cierre anterior
 * @property {{ number: number, closedAt: string } | null} lastClosing
 * @property {boolean} closable  hay pedidos cobrados por cerrar
 */

export const CASH_NOTE_MAX_LENGTH = 200;
const ID_PATTERN = /^[\w-]{1,80}$/;

const isColones = (value) => Number.isInteger(value) && value >= 0;

/** Efectivo que debería haber en el cajón. */
export function calculateExpectedCash(openingFloat, cashSales) {
  return openingFloat + cashSales;
}

/** Diferencia contra lo esperado: positivo sobra, negativo falta, 0 cuadra. */
export function calculateCashDifference(counted, expected) {
  return counted - expected;
}

/**
 * El fondo con el que se sugiere abrir: lo que se contó al cerrar la última vez.
 * @param {CashClosing | null | undefined} previous
 * @returns {number}
 */
export function suggestOpeningFloat(previous) {
  return previous?.cash?.counted ?? 0;
}

/**
 * Vista de lo pendiente por cerrar (lo que muestra la pantalla antes de contar).
 * @param {Object} params
 * @param {import('@/domain/orders/order').Order[]} params.orders  cobrados y aún sin cerrar
 * @param {CashClosing | null} params.previous  último cierre
 * @returns {CashPending}
 */
export function buildCashPending({ orders, previous }) {
  const paid = orders.filter(isPaidOrder);
  const sales = summarizeSales(paid);
  return {
    sales,
    since: previous?.closedAt ?? sales.firstSaleAt,
    suggestedOpeningFloat: suggestOpeningFloat(previous),
    lastClosing: previous ? { number: previous.number, closedAt: previous.closedAt } : null,
    closable: paid.length > 0,
  };
}

/**
 * Arma el cierre con los pedidos cobrados que aún no se han cerrado.
 * No depende del cliente: el servidor lo calcula con sus propios datos.
 *
 * @param {Object} params
 * @param {string} params.id  generado por quien cierra: reintentar con el mismo id no duplica
 * @param {import('@/domain/orders/order').Order[]} params.orders  cobrados y aún sin cerrar
 * @param {CashClosing | null} params.previous  último cierre
 * @param {number} params.openingFloat
 * @param {number} params.countedCash
 * @param {string} [params.note]
 * @param {{ id: string, name: string }} params.user
 * @param {Date} [params.now]
 * @returns {CashClosing}
 */
export function createCashClosing({
  id,
  orders,
  previous,
  openingFloat,
  countedCash,
  note = '',
  user,
  now = new Date(),
}) {
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    throw new CashClosingError(CASH_CLOSING_ERROR.INVALID_ID, 'El identificador del cierre no es válido');
  }
  if (!isColones(openingFloat) || !isColones(countedCash)) {
    throw new CashClosingError(
      CASH_CLOSING_ERROR.INVALID_AMOUNT,
      'El fondo inicial y el efectivo contado deben ser colones enteros',
    );
  }
  const cleanNote = typeof note === 'string' ? note.trim() : null;
  if (cleanNote === null || cleanNote.length > CASH_NOTE_MAX_LENGTH) {
    throw new CashClosingError(
      CASH_CLOSING_ERROR.INVALID_NOTE,
      `La observación admite hasta ${CASH_NOTE_MAX_LENGTH} caracteres`,
    );
  }

  const paid = orders.filter(isPaidOrder);
  if (paid.length === 0) {
    throw new CashClosingError(CASH_CLOSING_ERROR.NO_SALES, 'No hay pedidos cobrados por cerrar');
  }

  const sales = summarizeSales(paid);
  const cashSales = sales.byMethod[PAYMENT_METHOD.CASH].total;
  const expected = calculateExpectedCash(openingFloat, cashSales);

  return {
    id,
    number: (previous?.number ?? 0) + 1,
    closedAt: now.toISOString(),
    closedBy: { id: user.id, name: user.name },
    periodStart: previous?.closedAt ?? sales.firstSaleAt,
    sales,
    cash: {
      openingFloat,
      cashSales,
      expected,
      counted: countedCash,
      difference: calculateCashDifference(countedCash, expected),
    },
    note: cleanNote,
  };
}
