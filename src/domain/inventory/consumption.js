/**
 * Cuánto inventario gasta un pedido y cómo se descuenta. Funciones puras.
 *
 * Cada línea del pedido gasta, por cada unidad vendida, las porciones que dice
 * la receta de su producto; cada extra, las de la receta del extra, tantas
 * veces como su propia cantidad (un extra nunca supera las unidades de la línea).
 * Lo que no tiene receta no descuenta nada.
 */

/**
 * Porciones que gasta el pedido, por insumo.
 * @param {import('@/domain/orders/order').Order} order
 * @param {import('./inventoryAdmin').Inventory} inventory
 * @returns {Record<string, number>}  itemId → porciones
 */
export function calculateOrderUsage(order, inventory) {
  const usage = {};
  const add = (lines, times) => {
    for (const line of lines ?? []) {
      usage[line.itemId] = (usage[line.itemId] ?? 0) + line.portions * times;
    }
  };

  for (const item of order.items ?? []) {
    add(inventory.recipes.products[item.productId], item.quantity);
    for (const extra of item.extras ?? []) {
      add(inventory.recipes.extras[extra.extraId], extra.quantity);
    }
  }
  return usage;
}

/**
 * Resta el consumo del stock. Ignora los insumos que ya no existen. Nunca
 * bloquea: el stock puede quedar negativo (se vendió más de lo registrado).
 * @param {import('./inventoryAdmin').Inventory} inventory
 * @param {Record<string, number>} usage
 * @returns {import('./inventoryAdmin').Inventory}
 */
export function applyUsage(inventory, usage) {
  const used = inventory.items.filter((item) => usage[item.id]);
  if (used.length === 0) return inventory;
  return {
    ...inventory,
    items: inventory.items.map((item) =>
      usage[item.id] ? { ...item, stock: item.stock - usage[item.id] } : item,
    ),
  };
}

/**
 * Descuenta del inventario lo que gasta el pedido. Devuelve el mismo objeto si
 * el pedido no gasta nada.
 * @param {import('./inventoryAdmin').Inventory} inventory
 * @param {import('@/domain/orders/order').Order} order
 */
export function consumeOrder(inventory, order) {
  return applyUsage(inventory, calculateOrderUsage(order, inventory));
}
