import { useCallback, useReducer } from 'react';
import {
  addItem,
  createDraftOrder,
  removeItem,
  setItemNotes,
  setItemQuantity,
  setCustomerName,
  setOrderNote,
} from '@/domain/orders';

/**
 * El borrador es un pedido del dominio; cada acción aplica la función pura
 * correspondiente. Si una regla lo rechaza, el borrador queda como estaba.
 */
function reducer(order, action) {
  try {
    switch (action.type) {
      case 'add':
        return addItem(order, action.item);
      case 'setQuantity':
        return setItemQuantity(order, action.itemId, action.quantity);
      case 'setNotes':
        return setItemNotes(order, action.itemId, action.notes);
      case 'remove':
        return removeItem(order, action.itemId);
      case 'setNote':
        return setOrderNote(order, action.note);
      case 'setCustomerName':
        return setCustomerName(order, action.name);
      case 'reset':
        return createDraftOrder({ createdBy: action.user });
      default:
        return order;
    }
  } catch {
    return order;
  }
}

/**
 * Pedido que el cajero está armando.
 * @param {import('@/domain/users/roles').User} user  quién toma el pedido
 */
export function useOrderDraft(user) {
  const [order, dispatch] = useReducer(reducer, user, (current) => createDraftOrder({ createdBy: current }));

  return {
    order,
    isEmpty: order.items.length === 0,
    add: useCallback((item) => dispatch({ type: 'add', item }), []),
    setQuantity: useCallback((itemId, quantity) => dispatch({ type: 'setQuantity', itemId, quantity }), []),
    setNotes: useCallback((itemId, notes) => dispatch({ type: 'setNotes', itemId, notes }), []),
    remove: useCallback((itemId) => dispatch({ type: 'remove', itemId }), []),
    setNote: useCallback((note) => dispatch({ type: 'setNote', note }), []),
    setCustomerName: useCallback((name) => dispatch({ type: 'setCustomerName', name }), []),
    /** Empieza un pedido nuevo (con otro id) después de enviar. */
    reset: useCallback(() => dispatch({ type: 'reset', user }), [user]),
  };
}
