/**
 * Ajustes de la pantalla de cocina. Para cambiar cuándo una tarjeta se pone
 * ámbar o roja, se edita aquí.
 */
export const KITCHEN_CONFIG = Object.freeze({
  /** A partir de este tiempo (ms) el pedido se marca como "tardando". */
  warnAfterMs: 10 * 60 * 1000,
  /** A partir de este tiempo (ms) el pedido se marca como "urgente". */
  urgentAfterMs: 20 * 60 * 1000,
  /** Durante este tiempo (ms) un pedido recién llegado se resalta. */
  newArrivalHighlightMs: 20 * 1000,
});
