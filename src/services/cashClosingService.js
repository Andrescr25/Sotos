import { createId } from '@/shared/utils/createId';

/**
 * Casos de uso del cierre de caja. Las pantallas llaman a estas funciones; no
 * tocan el repositorio directamente. Quién puede cerrar y qué cubre cada cierre
 * lo decide el servidor (o el repositorio en memoria), nunca la pantalla.
 *
 * @param {Object} deps
 * @param {import('@/data/contracts').CashClosingRepository} deps.cashClosingRepository
 */
export function createCashClosingService({ cashClosingRepository }) {
  return {
    /** Lo cobrado desde el último cierre y lo que se sugiere como fondo inicial. */
    getPending: () => cashClosingRepository.getPending(),

    /** Cierres anteriores, del más reciente al más antiguo. */
    listClosings: (options) => cashClosingRepository.list(options),

    /**
     * Identificador de un intento de cierre. La pantalla lo conserva mientras
     * reintenta: si la respuesta se perdió, repetir el cierre con el mismo id
     * devuelve el ya guardado en lugar de duplicarlo.
     */
    newClosingId: () => createId('cls'),

    /**
     * Cierra la caja: cubre todos los pedidos cobrados que aún no tienen cierre.
     * @param {{ id: string, openingFloat: number, countedCash: number, note?: string }} input
     * @returns {Promise<import('@/domain/cashClosing').CashClosing>}
     */
    close: (input) => cashClosingRepository.close(input),
  };
}
