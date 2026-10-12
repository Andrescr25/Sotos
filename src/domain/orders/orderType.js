/**
 * Cómo se consume el pedido. Hoy solo se usa DINE_IN; los demás tipos existen
 * para que "para llevar" y "delivery" se agreguen sin migrar los pedidos.
 */
export const ORDER_TYPE = Object.freeze({
  DINE_IN: 'dine_in',
  TAKEOUT: 'takeout',
  DELIVERY: 'delivery',
});

export const ORDER_TYPE_LABELS = Object.freeze({
  [ORDER_TYPE.DINE_IN]: 'En el local',
  [ORDER_TYPE.TAKEOUT]: 'Para llevar',
  [ORDER_TYPE.DELIVERY]: 'Delivery',
});
