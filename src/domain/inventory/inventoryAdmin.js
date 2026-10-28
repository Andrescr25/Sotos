import { createId } from '@/shared/utils/createId';
import { INVENTORY_ERROR, InventoryError } from './inventoryErrors';
import {
  AMOUNT_MAX,
  PORTIONS_PER_UNIT_MAX,
  cleanName,
  cleanUnit,
  nameKey,
  validateAmount,
  validatePortionsPerUnit,
} from './inventoryRules';

/**
 * Operaciones del administrador sobre el inventario. Son funciones puras: reciben
 * el inventario y devuelven uno nuevo (o lanzan InventoryError). El servidor y el
 * modo en memoria aplican exactamente estas mismas reglas.
 *
 * Todo se cuenta en PORCIONES enteras, igual que el dinero va en colones enteros:
 * un paquete que rinde 8 porciones y se usa 1/8 en un platillo es "1 porción", sin
 * decimales ni errores de redondeo.
 *
 * @typedef {Object} InventoryItem  un insumo: lo que se compra y se reparte en porciones
 * @property {string} id
 * @property {string} name  "Paquete de papas"
 * @property {string} unit  cómo se compra o se cuenta: "paquete", "kg", "botella"
 * @property {number} portionsPerUnit  cuántas porciones rinde una unidad (entero ≥ 1)
 * @property {number} stock  porciones disponibles; negativo = se vendió más de lo registrado
 * @property {number} minPortions  avisar cuando queden menos de estas porciones (0 = sin aviso)
 *
 * @typedef {Object} RecipeLine  cuánto de un insumo usa una unidad vendida
 * @property {string} itemId
 * @property {number} portions  entero ≥ 1
 *
 * @typedef {Object} Inventory
 * @property {InventoryItem[]} items
 * @property {{ products: Record<string, RecipeLine[]>, extras: Record<string, RecipeLine[]> }} recipes
 *   receta de cada producto y de cada extra, por su id del menú. Sin receta no descuenta nada.
 */

export const RECIPE_KIND = Object.freeze({
  PRODUCTS: 'products',
  EXTRAS: 'extras',
});

const RECIPE_KINDS = Object.values(RECIPE_KIND);

/** @returns {Inventory} */
export function emptyInventory() {
  return { items: [], recipes: { products: {}, extras: {} } };
}

/**
 * Completa campos que falten (por ejemplo, un documento guardado por una versión anterior).
 * @param {Partial<Inventory> | null | undefined} raw
 * @returns {Inventory}
 */
export function normalizeInventory(raw) {
  return {
    items: raw?.items ?? [],
    recipes: {
      products: raw?.recipes?.products ?? {},
      extras: raw?.recipes?.extras ?? {},
    },
  };
}

function findItemOrThrow(inventory, id) {
  const item = inventory.items.find((candidate) => candidate.id === id);
  if (!item) throw new InventoryError(INVENTORY_ERROR.ITEM_NOT_FOUND, 'El insumo no existe');
  return item;
}

function assertUniqueName(items, name, exceptId) {
  const key = nameKey(name);
  if (items.some((item) => item.id !== exceptId && nameKey(item.name) === key)) {
    throw new InventoryError(INVENTORY_ERROR.DUPLICATE_NAME, `Ya existe "${name}"`);
  }
}

const replaceById = (items, id, next) => items.map((item) => (item.id === id ? next : item));

/**
 * @param {Inventory} inventory
 * @param {{ name: string, unit: string, portionsPerUnit: number, stock?: number, minPortions?: number }} input
 * @param {{ id?: string }} [options]
 */
export function createItem(inventory, input, { id = createId('inv') } = {}) {
  const name = cleanName(input?.name);
  const unit = cleanUnit(input?.unit);
  const portionsPerUnit = validatePortionsPerUnit(input?.portionsPerUnit);
  const stock = validateAmount(input?.stock ?? 0);
  const minPortions = validateAmount(input?.minPortions ?? 0);
  assertUniqueName(inventory.items, name);

  const item = { id, name, unit, portionsPerUnit, stock, minPortions };
  return { ...inventory, items: [...inventory.items, item] };
}

/**
 * Edita los datos del insumo. El stock no se cambia aquí: se ajusta con `adjustStock`.
 *
 * Cambiar `portionsPerUnit` redefine qué significa cada porción: el stock y las
 * recetas siguen contando porciones, así que conviene revisarlos después.
 *
 * @param {Inventory} inventory
 * @param {string} id
 * @param {{ name?: string, unit?: string, portionsPerUnit?: number, minPortions?: number }} patch
 */
export function updateItem(inventory, id, patch) {
  const current = findItemOrThrow(inventory, id);
  const next = { ...current };

  if ('name' in patch) {
    next.name = cleanName(patch.name);
    assertUniqueName(inventory.items, next.name, id);
  }
  if ('unit' in patch) next.unit = cleanUnit(patch.unit);
  if ('portionsPerUnit' in patch) next.portionsPerUnit = validatePortionsPerUnit(patch.portionsPerUnit);
  if ('minPortions' in patch) next.minPortions = validateAmount(patch.minPortions);

  return { ...inventory, items: replaceById(inventory.items, id, next) };
}

const withoutItem = (recipes, itemId) =>
  Object.fromEntries(
    Object.entries(recipes)
      .map(([targetId, lines]) => [targetId, lines.filter((line) => line.itemId !== itemId)])
      .filter(([, lines]) => lines.length > 0),
  );

/**
 * Elimina el insumo y lo quita de todas las recetas que lo usaban.
 * @param {Inventory} inventory
 * @param {string} id
 */
export function deleteItem(inventory, id) {
  findItemOrThrow(inventory, id);
  return {
    items: inventory.items.filter((item) => item.id !== id),
    recipes: {
      products: withoutItem(inventory.recipes.products, id),
      extras: withoutItem(inventory.recipes.extras, id),
    },
  };
}

/**
 * Cambia el stock de un insumo, siempre en porciones:
 * - `add`: suma (una compra) o resta (merma, salida) un entero, positivo o negativo.
 * - `set`: fija lo contado físicamente (entero ≥ 0).
 *
 * @param {Inventory} inventory
 * @param {string} id
 * @param {{ mode: 'add' | 'set', portions: number }} adjustment
 */
export function adjustStock(inventory, id, adjustment) {
  const current = findItemOrThrow(inventory, id);
  const { mode, portions } = adjustment ?? {};

  let stock;
  if (mode === 'set') {
    stock = validateAmount(portions);
  } else if (mode === 'add') {
    if (!Number.isInteger(portions) || Math.abs(portions) > AMOUNT_MAX) {
      throw new InventoryError(
        INVENTORY_ERROR.INVALID_AMOUNT,
        `El ajuste debe ser un entero de porciones (hasta ${AMOUNT_MAX})`,
      );
    }
    stock = current.stock + portions;
  } else {
    throw new InventoryError(INVENTORY_ERROR.INVALID_ADJUSTMENT, 'El ajuste debe ser sumar o fijar');
  }

  return { ...inventory, items: replaceById(inventory.items, id, { ...current, stock }) };
}

/**
 * Define cuánto usa de cada insumo una unidad vendida de un producto o de un
 * extra. Reemplaza la receta anterior; sin líneas, la quita (ya no descuenta).
 *
 * @param {Inventory} inventory
 * @param {'products' | 'extras'} kind
 * @param {string} targetId  id del producto o del extra en el menú
 * @param {RecipeLine[]} lines
 */
export function setRecipe(inventory, kind, targetId, lines) {
  if (!RECIPE_KINDS.includes(kind)) {
    throw new InventoryError(INVENTORY_ERROR.INVALID_RECIPE, 'La receta debe ser de un producto o de un extra');
  }
  if (typeof targetId !== 'string' || targetId.length === 0 || !Array.isArray(lines)) {
    throw new InventoryError(INVENTORY_ERROR.INVALID_RECIPE, 'La receta no tiene la forma esperada');
  }

  const seen = new Set();
  const clean = lines.map((line) => {
    const item = findItemOrThrow(inventory, line?.itemId);
    if (seen.has(item.id)) {
      throw new InventoryError(INVENTORY_ERROR.INVALID_RECIPE, `"${item.name}" está repetido en la receta`);
    }
    seen.add(item.id);
    if (!Number.isInteger(line.portions) || line.portions < 1 || line.portions > PORTIONS_PER_UNIT_MAX) {
      throw new InventoryError(
        INVENTORY_ERROR.INVALID_RECIPE,
        `Las porciones de "${item.name}" deben ser un entero entre 1 y ${PORTIONS_PER_UNIT_MAX}`,
      );
    }
    return { itemId: item.id, portions: line.portions };
  });

  const { [targetId]: _removed, ...others } = inventory.recipes[kind];
  return {
    ...inventory,
    recipes: {
      ...inventory.recipes,
      [kind]: clean.length > 0 ? { ...others, [targetId]: clean } : others,
    },
  };
}
