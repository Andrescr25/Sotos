import { menuSeed } from '@/data/seed/menu';
import { usersSeed } from '@/data/seed/users';
import { findProduct } from '@/domain/menu';
import {
  addItem,
  createDraftOrder,
  createOrderItem,
  sendOrderToKitchen,
  setCustomerName,
} from '@/domain/orders';
import { PAYMENT_METHOD } from '@/domain/payments';
import {
  INVENTORY_ERROR,
  InventoryError,
  RECIPE_KIND,
  STOCK_STATUS,
  adjustStock,
  applyUsage,
  calculateOrderUsage,
  consumeOrder,
  createItem,
  deleteItem,
  describeStock,
  emptyInventory,
  formatPortions,
  getStockStatus,
  normalizeInventory,
  pluralizeUnit,
  setRecipe,
  splitPortions,
  toPortions,
  updateItem,
} from '@/domain/inventory';

const [cashier] = usersSeed;

function expectInventoryError(fn, code) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(InventoryError);
    expect(error.code).toBe(code);
    return;
  }
  throw new Error(`Se esperaba InventoryError ${code} pero no se lanzó ningún error`);
}

/** Inventario del ejemplo: 3 paquetes de papas (8 porciones c/u) y una botella de salsa. */
function exampleInventory() {
  let inventory = emptyInventory();
  inventory = createItem(inventory, { name: 'Paquete de papas', unit: 'paquete', portionsPerUnit: 8, stock: 24 }, { id: 'papas' });
  inventory = createItem(inventory, { name: 'Salsa de tomate', unit: 'botella', portionsPerUnit: 20, stock: 20, minPortions: 5 }, { id: 'salsa' });
  inventory = createItem(inventory, { name: 'Queso', unit: 'kg', portionsPerUnit: 10, stock: 30 }, { id: 'queso' });
  return inventory;
}

describe('insumos', () => {
  it('un inventario nuevo está vacío y se completa lo que falte', () => {
    expect(emptyInventory()).toEqual({ items: [], recipes: { products: {}, extras: {} } });
    expect(normalizeInventory(null)).toEqual(emptyInventory());
    expect(normalizeInventory({ items: [{ id: 'a' }] }).recipes).toEqual({ products: {}, extras: {} });
  });

  it('crea un insumo con su stock en porciones', () => {
    const inventory = createItem(emptyInventory(), { name: '  Paquete   de papas ', unit: 'paquete', portionsPerUnit: 8, stock: 16 }, { id: 'papas' });

    expect(inventory.items).toEqual([
      { id: 'papas', name: 'Paquete de papas', unit: 'paquete', portionsPerUnit: 8, stock: 16, minPortions: 0 },
    ]);
  });

  it('no repite nombres, sin distinguir mayúsculas', () => {
    expectInventoryError(
      () => createItem(exampleInventory(), { name: 'PAQUETE DE PAPAS', unit: 'paquete', portionsPerUnit: 8 }),
      INVENTORY_ERROR.DUPLICATE_NAME,
    );
  });

  it.each([
    [INVENTORY_ERROR.INVALID_NAME, { name: '   ', unit: 'paquete', portionsPerUnit: 8 }],
    [INVENTORY_ERROR.INVALID_NAME, { name: 'x'.repeat(61), unit: 'paquete', portionsPerUnit: 8 }],
    [INVENTORY_ERROR.INVALID_UNIT, { name: 'Papas', unit: '', portionsPerUnit: 8 }],
    [INVENTORY_ERROR.INVALID_PORTIONS, { name: 'Papas', unit: 'paquete', portionsPerUnit: 0 }],
    [INVENTORY_ERROR.INVALID_PORTIONS, { name: 'Papas', unit: 'paquete', portionsPerUnit: 2.5 }],
    [INVENTORY_ERROR.INVALID_PORTIONS, { name: 'Papas', unit: 'paquete', portionsPerUnit: '8' }],
    [INVENTORY_ERROR.INVALID_AMOUNT, { name: 'Papas', unit: 'paquete', portionsPerUnit: 8, stock: -1 }],
    [INVENTORY_ERROR.INVALID_AMOUNT, { name: 'Papas', unit: 'paquete', portionsPerUnit: 8, stock: 1.5 }],
    [INVENTORY_ERROR.INVALID_AMOUNT, { name: 'Papas', unit: 'paquete', portionsPerUnit: 8, minPortions: -2 }],
  ])('rechaza datos inválidos (%s)', (code, input) => {
    expectInventoryError(() => createItem(emptyInventory(), input), code);
  });

  it('edita nombre, unidad, porciones y mínimo, pero no el stock', () => {
    const updated = updateItem(exampleInventory(), 'papas', {
      name: 'Papas congeladas',
      unit: 'bolsa',
      portionsPerUnit: 10,
      minPortions: 4,
      stock: 999,
    });

    expect(updated.items[0]).toEqual({
      id: 'papas', name: 'Papas congeladas', unit: 'bolsa', portionsPerUnit: 10, stock: 24, minPortions: 4,
    });
  });

  it('editar respeta nombres únicos y existencia', () => {
    expectInventoryError(() => updateItem(exampleInventory(), 'papas', { name: 'queso' }), INVENTORY_ERROR.DUPLICATE_NAME);
    expectInventoryError(() => updateItem(exampleInventory(), 'nada', { name: 'X' }), INVENTORY_ERROR.ITEM_NOT_FOUND);
    // Conservar el propio nombre no es un duplicado.
    expect(updateItem(exampleInventory(), 'papas', { name: 'Paquete de papas' }).items[0].name).toBe('Paquete de papas');
  });

  it('eliminar un insumo lo quita de todas las recetas y borra las que quedan vacías', () => {
    let inventory = exampleInventory();
    inventory = setRecipe(inventory, RECIPE_KIND.PRODUCTS, 'prod-papas', [{ itemId: 'papas', portions: 1 }]);
    inventory = setRecipe(inventory, RECIPE_KIND.PRODUCTS, 'prod-hamburguesa', [
      { itemId: 'papas', portions: 1 },
      { itemId: 'queso', portions: 2 },
    ]);
    inventory = setRecipe(inventory, RECIPE_KIND.EXTRAS, 'extra-queso', [{ itemId: 'queso', portions: 1 }]);

    const after = deleteItem(inventory, 'queso');

    expect(after.items.map((item) => item.id)).toEqual(['papas', 'salsa']);
    expect(after.recipes.products).toEqual({
      'prod-papas': [{ itemId: 'papas', portions: 1 }],
      'prod-hamburguesa': [{ itemId: 'papas', portions: 1 }],
    });
    expect(after.recipes.extras).toEqual({}); // quedó vacía
    expectInventoryError(() => deleteItem(after, 'queso'), INVENTORY_ERROR.ITEM_NOT_FOUND);
  });
});

describe('ajustes de stock', () => {
  it('suma lo que entra (una compra) y resta lo que sale (merma)', () => {
    const bought = adjustStock(exampleInventory(), 'papas', { mode: 'add', portions: 16 });
    expect(bought.items[0].stock).toBe(40);

    const waste = adjustStock(bought, 'papas', { mode: 'add', portions: -3 });
    expect(waste.items[0].stock).toBe(37);
  });

  it('fija lo contado en un conteo físico', () => {
    expect(adjustStock(exampleInventory(), 'papas', { mode: 'set', portions: 5 }).items[0].stock).toBe(5);
    expect(adjustStock(exampleInventory(), 'papas', { mode: 'set', portions: 0 }).items[0].stock).toBe(0);
  });

  it('un conteo no puede ser negativo ni decimal, y el modo debe ser válido', () => {
    expectInventoryError(() => adjustStock(exampleInventory(), 'papas', { mode: 'set', portions: -1 }), INVENTORY_ERROR.INVALID_AMOUNT);
    expectInventoryError(() => adjustStock(exampleInventory(), 'papas', { mode: 'add', portions: 0.5 }), INVENTORY_ERROR.INVALID_AMOUNT);
    expectInventoryError(() => adjustStock(exampleInventory(), 'papas', { mode: 'add', portions: '3' }), INVENTORY_ERROR.INVALID_AMOUNT);
    expectInventoryError(() => adjustStock(exampleInventory(), 'papas', { mode: 'multiplicar', portions: 2 }), INVENTORY_ERROR.INVALID_ADJUSTMENT);
    expectInventoryError(() => adjustStock(exampleInventory(), 'papas', undefined), INVENTORY_ERROR.INVALID_ADJUSTMENT);
    expectInventoryError(() => adjustStock(exampleInventory(), 'nada', { mode: 'add', portions: 1 }), INVENTORY_ERROR.ITEM_NOT_FOUND);
  });
});

describe('recetas', () => {
  it('define cuántas porciones usa un producto de cada insumo', () => {
    const inventory = setRecipe(exampleInventory(), RECIPE_KIND.PRODUCTS, 'prod-papas', [
      { itemId: 'papas', portions: 1 },
      { itemId: 'salsa', portions: 2 },
    ]);

    expect(inventory.recipes.products['prod-papas']).toEqual([
      { itemId: 'papas', portions: 1 },
      { itemId: 'salsa', portions: 2 },
    ]);
  });

  it('reemplaza la receta anterior y, sin líneas, la quita', () => {
    let inventory = setRecipe(exampleInventory(), RECIPE_KIND.PRODUCTS, 'prod-papas', [{ itemId: 'papas', portions: 1 }]);
    inventory = setRecipe(inventory, RECIPE_KIND.PRODUCTS, 'prod-papas', [{ itemId: 'salsa', portions: 3 }]);
    expect(inventory.recipes.products['prod-papas']).toEqual([{ itemId: 'salsa', portions: 3 }]);

    inventory = setRecipe(inventory, RECIPE_KIND.PRODUCTS, 'prod-papas', []);
    expect(inventory.recipes.products).toEqual({});
  });

  it('los extras tienen sus propias recetas, separadas de los productos', () => {
    const inventory = setRecipe(exampleInventory(), RECIPE_KIND.EXTRAS, 'extra-queso', [{ itemId: 'queso', portions: 1 }]);
    expect(inventory.recipes.extras['extra-queso']).toBeDefined();
    expect(inventory.recipes.products).toEqual({});
  });

  it.each([
    ['insumo inexistente', [{ itemId: 'nada', portions: 1 }], INVENTORY_ERROR.ITEM_NOT_FOUND],
    ['insumo repetido', [{ itemId: 'papas', portions: 1 }, { itemId: 'papas', portions: 2 }], INVENTORY_ERROR.INVALID_RECIPE],
    ['cero porciones', [{ itemId: 'papas', portions: 0 }], INVENTORY_ERROR.INVALID_RECIPE],
    ['porciones decimales', [{ itemId: 'papas', portions: 0.5 }], INVENTORY_ERROR.INVALID_RECIPE],
    ['porciones como texto', [{ itemId: 'papas', portions: '1' }], INVENTORY_ERROR.INVALID_RECIPE],
    ['no es una lista', 'papas', INVENTORY_ERROR.INVALID_RECIPE],
  ])('rechaza una receta con %s', (_name, lines, code) => {
    expectInventoryError(() => setRecipe(exampleInventory(), RECIPE_KIND.PRODUCTS, 'prod-papas', lines), code);
  });

  it('rechaza un tipo de receta desconocido', () => {
    expectInventoryError(() => setRecipe(exampleInventory(), 'bebidas', 'x', []), INVENTORY_ERROR.INVALID_RECIPE);
  });

  it('no modifica el inventario original', () => {
    const original = exampleInventory();
    const before = JSON.stringify(original);
    setRecipe(original, RECIPE_KIND.PRODUCTS, 'prod-papas', [{ itemId: 'papas', portions: 1 }]);
    adjustStock(original, 'papas', { mode: 'add', portions: 5 });
    deleteItem(original, 'papas');
    expect(JSON.stringify(original)).toBe(before);
  });
});

describe('consumo de un pedido', () => {
  const product = (id) => findProduct(menuSeed, id);
  const extra = (id) => menuSeed.extras.find((candidate) => candidate.id === id);

  function sentOrder(items) {
    let draft = setCustomerName(createDraftOrder({ createdBy: cashier }), 'María Pérez');
    for (const item of items) draft = addItem(draft, item);
    return sendOrderToKitchen(draft, { number: 1, user: cashier, payment: { method: PAYMENT_METHOD.CARD } });
  }

  /** Papas: 1/8 de paquete. Hamburguesa clásica: 1 porción de papas y 2 de queso. Queso extra: 3 de queso. */
  function withRecipes() {
    let inventory = exampleInventory();
    inventory = setRecipe(inventory, RECIPE_KIND.PRODUCTS, 'prod-papas', [{ itemId: 'papas', portions: 1 }]);
    inventory = setRecipe(inventory, RECIPE_KIND.PRODUCTS, 'prod-hamburguesa-clasica', [
      { itemId: 'papas', portions: 1 },
      { itemId: 'queso', portions: 2 },
    ]);
    inventory = setRecipe(inventory, RECIPE_KIND.EXTRAS, 'extra-queso', [{ itemId: 'queso', portions: 3 }]);
    return inventory;
  }

  it('el ejemplo del paquete de papas: cada plato de papas rebaja 1/8 del paquete', () => {
    const inventory = withRecipes();
    const order = sentOrder([createOrderItem({ product: product('prod-papas'), quantity: 1 })]);

    const after = consumeOrder(inventory, order);

    expect(after.items.find((item) => item.id === 'papas').stock).toBe(23); // de 24 porciones (3 paquetes)
    expect(describeStock(after.items.find((item) => item.id === 'papas'))).toBe('2 y 7/8 paquetes');
  });

  it('multiplica por la cantidad de la línea', () => {
    const order = sentOrder([createOrderItem({ product: product('prod-papas'), quantity: 5 })]);
    expect(calculateOrderUsage(order, withRecipes())).toEqual({ papas: 5 });
  });

  it('los extras descuentan con su propia cantidad, no con la de la línea', () => {
    // 2 hamburguesas, solo 1 con queso extra.
    const order = sentOrder([
      createOrderItem({
        product: product('prod-hamburguesa-clasica'),
        quantity: 2,
        extras: [{ extra: extra('extra-queso'), quantity: 1 }],
      }),
    ]);

    // papas: 2 × 1; queso: 2 × 2 (hamburguesas) + 1 × 3 (un queso extra) = 7
    expect(calculateOrderUsage(order, withRecipes())).toEqual({ papas: 2, queso: 7 });
  });

  it('suma lo de varias líneas y deja igual lo que no tiene receta', () => {
    const order = sentOrder([
      createOrderItem({ product: product('prod-papas'), quantity: 2 }),
      createOrderItem({ product: product('prod-hamburguesa-clasica'), quantity: 1 }),
      createOrderItem({ product: product('prod-coca-cola'), quantity: 4 }), // sin receta
    ]);

    expect(calculateOrderUsage(order, withRecipes())).toEqual({ papas: 3, queso: 2 });
  });

  it('un pedido sin recetas no cambia nada y devuelve el mismo inventario', () => {
    const inventory = exampleInventory();
    const order = sentOrder([createOrderItem({ product: product('prod-coca-cola'), quantity: 1 })]);

    expect(consumeOrder(inventory, order)).toBe(inventory);
  });

  it('nunca bloquea: el stock puede quedar negativo y se lee como faltante', () => {
    const inventory = adjustStock(withRecipes(), 'papas', { mode: 'set', portions: 2 });
    const order = sentOrder([createOrderItem({ product: product('prod-papas'), quantity: 5 })]);

    const after = consumeOrder(inventory, order);
    const papas = after.items.find((item) => item.id === 'papas');

    expect(papas.stock).toBe(-3);
    expect(describeStock(papas)).toBe('Faltan 3/8 de paquete');
    expect(getStockStatus(papas)).toBe(STOCK_STATUS.OUT);
  });

  it('ignora los insumos que ya no existen y no modifica el inventario original', () => {
    const inventory = withRecipes();
    const before = JSON.stringify(inventory);

    expect(applyUsage(inventory, { fantasma: 4 })).toBe(inventory);
    consumeOrder(inventory, sentOrder([createOrderItem({ product: product('prod-papas'), quantity: 1 })]));
    expect(JSON.stringify(inventory)).toBe(before);
  });
});

describe('lectura del stock', () => {
  const papas = { unit: 'paquete', portionsPerUnit: 8 };

  it('lee las porciones como fracciones de la unidad', () => {
    expect(formatPortions(0, papas)).toBe('0 paquetes');
    expect(formatPortions(1, papas)).toBe('1/8 de paquete');
    expect(formatPortions(2, papas)).toBe('1/4 de paquete');
    expect(formatPortions(4, papas)).toBe('1/2 de paquete');
    expect(formatPortions(8, papas)).toBe('1 paquete');
    expect(formatPortions(9, papas)).toBe('1 y 1/8 paquetes');
    expect(formatPortions(19, papas)).toBe('2 y 3/8 paquetes');
    expect(formatPortions(24, papas)).toBe('3 paquetes');
  });

  it('una unidad de una sola porción se cuenta de uno en uno', () => {
    expect(formatPortions(1, { unit: 'botella', portionsPerUnit: 1 })).toBe('1 botella');
    expect(formatPortions(12, { unit: 'botella', portionsPerUnit: 1 })).toBe('12 botellas');
  });

  it('conoce el plural de las unidades más comunes y deja intactas las abreviaturas y frases', () => {
    expect(pluralizeUnit('paquete', 2)).toBe('paquetes');
    expect(pluralizeUnit('paquete', 1)).toBe('paquete');
    expect(pluralizeUnit('unidad', 3)).toBe('unidades');
    expect(pluralizeUnit('galón', 2)).toBe('galones');
    expect(pluralizeUnit('café', 2)).toBe('cafés');
    expect(pluralizeUnit('kg', 5)).toBe('kg');
    expect(pluralizeUnit('ml', 5)).toBe('ml');
    expect(pluralizeUnit('bolsa de 5 kg', 2)).toBe('bolsa de 5 kg');
  });

  it('convierte entre unidades completas y porciones', () => {
    expect(splitPortions(19, 8)).toEqual({ units: 2, remainder: 3 });
    expect(toPortions({ units: 2, portions: 3 }, 8)).toBe(19);
    expect(toPortions({ units: 3 }, 8)).toBe(24);
    expect(toPortions({ portions: 5 }, 8)).toBe(5);
  });

  it('el estado: bien, por reponer (bajo el mínimo) o agotado', () => {
    expect(getStockStatus({ stock: 10, minPortions: 0 })).toBe(STOCK_STATUS.OK);
    expect(getStockStatus({ stock: 10, minPortions: 5 })).toBe(STOCK_STATUS.OK);
    expect(getStockStatus({ stock: 5, minPortions: 5 })).toBe(STOCK_STATUS.OK); // igual al mínimo todavía alcanza
    expect(getStockStatus({ stock: 4, minPortions: 5 })).toBe(STOCK_STATUS.LOW);
    expect(getStockStatus({ stock: 0, minPortions: 0 })).toBe(STOCK_STATUS.OUT);
    expect(getStockStatus({ stock: -2, minPortions: 5 })).toBe(STOCK_STATUS.OUT);
  });
});
