import { createId } from '@/shared/utils/createId';
import { MENU_ERROR, MenuError } from './menuErrors';
import {
  cleanName,
  cleanNote,
  nameKey,
  validateIcon,
  validateKind,
  validatePrice,
} from './menuRules';

/**
 * Operaciones del administrador sobre el menú. Son funciones puras: reciben el
 * menú y devuelven uno nuevo (o lanzan MenuError). El servidor y el modo en
 * memoria aplican exactamente estas mismas reglas.
 *
 * Los pedidos ya tomados guardan una copia del nombre y precio, así que
 * editar o eliminar aquí nunca altera pedidos existentes.
 *
 * @typedef {import('./types').Menu} Menu
 */

export const MENU_COLLECTION = Object.freeze({
  CATEGORIES: 'categories',
  PRODUCTS: 'products',
  EXTRAS: 'extras',
});

const COLLECTIONS = Object.values(MENU_COLLECTION);

/** @returns {Menu} */
export function emptyMenu() {
  return { categories: [], products: [], extras: [], quickNotes: [] };
}

/**
 * Completa campos que falten (por ejemplo, un menú guardado por una versión anterior).
 * @param {Partial<Menu> | null | undefined} raw
 * @returns {Menu}
 */
export function normalizeMenu(raw) {
  return {
    categories: raw?.categories ?? [],
    products: raw?.products ?? [],
    // Los extras de menús antiguos no traían orden: se les asigna uno.
    extras: (raw?.extras ?? []).map((extra, index) => ({
      ...extra,
      sortOrder: extra.sortOrder ?? index + 1,
    })),
    quickNotes: raw?.quickNotes ?? [],
  };
}

/** @param {Menu} menu */
export function isMenuEmpty(menu) {
  return (
    menu.categories.length === 0 && menu.products.length === 0 && menu.extras.length === 0
  );
}

const nextSortOrder = (items) => items.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1;

function findOrThrow(items, id, code, label) {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new MenuError(code, `${label} no existe`);
  return item;
}

function assertUniqueName(items, name, exceptId) {
  const key = nameKey(name);
  if (items.some((item) => item.id !== exceptId && nameKey(item.name) === key)) {
    throw new MenuError(MENU_ERROR.DUPLICATE_NAME, `Ya existe "${name}"`);
  }
}

const replaceById = (items, id, next) => items.map((item) => (item.id === id ? next : item));

function assertBoolean(value) {
  if (typeof value !== 'boolean') {
    throw new MenuError(MENU_ERROR.INVALID_ACTIVE, 'El estado debe ser verdadero o falso');
  }
  return value;
}

/** Valida que todos los extras existan; quita repetidos conservando el orden. */
function resolveExtraIds(menu, extraIds) {
  const ids = [...new Set(Array.isArray(extraIds) ? extraIds : [])];
  ids.forEach((extraId) => {
    if (!menu.extras.some((extra) => extra.id === extraId)) {
      throw new MenuError(MENU_ERROR.EXTRA_NOT_FOUND, 'Un extra seleccionado ya no existe');
    }
  });
  return ids;
}

// ── Categorías ─────────────────────────────────────────────────────────────

/**
 * @param {Menu} menu
 * @param {{ name: string, icon?: string | null }} input
 * @param {{ id?: string }} [options]
 */
export function createCategory(menu, input, { id = createId('cat') } = {}) {
  const name = cleanName(input?.name);
  const icon = validateIcon(input?.icon);
  assertUniqueName(menu.categories, name);

  const category = { id, name, icon, sortOrder: nextSortOrder(menu.categories), active: true };
  return { ...menu, categories: [...menu.categories, category] };
}

/**
 * @param {Menu} menu
 * @param {string} id
 * @param {{ name?: string, icon?: string | null, active?: boolean }} patch
 */
export function updateCategory(menu, id, patch) {
  const current = findOrThrow(menu.categories, id, MENU_ERROR.CATEGORY_NOT_FOUND, 'La categoría');
  const next = { ...current };

  if ('name' in patch) {
    next.name = cleanName(patch.name);
    assertUniqueName(menu.categories, next.name, id);
  }
  if ('icon' in patch) next.icon = validateIcon(patch.icon);
  if ('active' in patch) next.active = assertBoolean(patch.active);

  return { ...menu, categories: replaceById(menu.categories, id, next) };
}

/**
 * Solo se puede eliminar una categoría vacía; si tiene productos, se oculta.
 * @param {Menu} menu
 * @param {string} id
 */
export function deleteCategory(menu, id) {
  findOrThrow(menu.categories, id, MENU_ERROR.CATEGORY_NOT_FOUND, 'La categoría');
  if (menu.products.some((product) => product.categoryId === id)) {
    throw new MenuError(
      MENU_ERROR.CATEGORY_NOT_EMPTY,
      'La categoría todavía tiene productos: muévelos o elimínalos primero',
    );
  }
  return { ...menu, categories: menu.categories.filter((category) => category.id !== id) };
}

// ── Productos (platillos y bebidas) ────────────────────────────────────────

/**
 * @param {Menu} menu
 * @param {{ categoryId: string, name: string, kind: 'dish' | 'drink', price: number, extraIds?: string[] }} input
 * @param {{ id?: string }} [options]
 */
export function createProduct(menu, input, { id = createId('prod') } = {}) {
  findOrThrow(menu.categories, input?.categoryId, MENU_ERROR.CATEGORY_NOT_FOUND, 'La categoría');
  const name = cleanName(input?.name);
  const kind = validateKind(input?.kind);
  const price = validatePrice(input?.price);
  const extraIds = resolveExtraIds(menu, input?.extraIds);

  const siblings = menu.products.filter((product) => product.categoryId === input.categoryId);
  assertUniqueName(siblings, name);

  const product = {
    id,
    categoryId: input.categoryId,
    name,
    kind,
    price,
    extraIds,
    sortOrder: nextSortOrder(siblings),
    active: true,
  };
  return { ...menu, products: [...menu.products, product] };
}

/**
 * @param {Menu} menu
 * @param {string} id
 * @param {{ name?: string, categoryId?: string, kind?: string, price?: number, extraIds?: string[], active?: boolean }} patch
 */
export function updateProduct(menu, id, patch) {
  const current = findOrThrow(menu.products, id, MENU_ERROR.PRODUCT_NOT_FOUND, 'El producto');
  const next = { ...current };

  if ('categoryId' in patch && patch.categoryId !== current.categoryId) {
    findOrThrow(menu.categories, patch.categoryId, MENU_ERROR.CATEGORY_NOT_FOUND, 'La categoría');
    next.categoryId = patch.categoryId;
    // Al pasar a otra categoría queda al final de ella.
    next.sortOrder = nextSortOrder(
      menu.products.filter((product) => product.categoryId === patch.categoryId),
    );
  }
  if ('name' in patch) next.name = cleanName(patch.name);
  if ('kind' in patch) next.kind = validateKind(patch.kind);
  if ('price' in patch) next.price = validatePrice(patch.price);
  if ('extraIds' in patch) next.extraIds = resolveExtraIds(menu, patch.extraIds);
  if ('active' in patch) next.active = assertBoolean(patch.active);

  const siblings = menu.products.filter((product) => product.categoryId === next.categoryId);
  assertUniqueName(siblings, next.name, id);

  return { ...menu, products: replaceById(menu.products, id, next) };
}

/**
 * @param {Menu} menu
 * @param {string} id
 */
export function deleteProduct(menu, id) {
  findOrThrow(menu.products, id, MENU_ERROR.PRODUCT_NOT_FOUND, 'El producto');
  return { ...menu, products: menu.products.filter((product) => product.id !== id) };
}

// ── Extras ─────────────────────────────────────────────────────────────────

/**
 * @param {Menu} menu
 * @param {{ name: string, price: number }} input
 * @param {{ id?: string }} [options]
 */
export function createExtra(menu, input, { id = createId('extra') } = {}) {
  const name = cleanName(input?.name);
  const price = validatePrice(input?.price);
  assertUniqueName(menu.extras, name);

  const extra = { id, name, price, sortOrder: nextSortOrder(menu.extras), active: true };
  return { ...menu, extras: [...menu.extras, extra] };
}

/**
 * @param {Menu} menu
 * @param {string} id
 * @param {{ name?: string, price?: number, active?: boolean }} patch
 */
export function updateExtra(menu, id, patch) {
  const current = findOrThrow(menu.extras, id, MENU_ERROR.EXTRA_NOT_FOUND, 'El extra');
  const next = { ...current };

  if ('name' in patch) {
    next.name = cleanName(patch.name);
    assertUniqueName(menu.extras, next.name, id);
  }
  if ('price' in patch) next.price = validatePrice(patch.price);
  if ('active' in patch) next.active = assertBoolean(patch.active);

  return { ...menu, extras: replaceById(menu.extras, id, next) };
}

/**
 * Elimina el extra y lo quita de todos los productos que lo ofrecían.
 * @param {Menu} menu
 * @param {string} id
 */
export function deleteExtra(menu, id) {
  findOrThrow(menu.extras, id, MENU_ERROR.EXTRA_NOT_FOUND, 'El extra');
  return {
    ...menu,
    extras: menu.extras.filter((extra) => extra.id !== id),
    products: menu.products.map((product) =>
      product.extraIds.includes(id)
        ? { ...product, extraIds: product.extraIds.filter((extraId) => extraId !== id) }
        : product,
    ),
  };
}

// ── Orden ──────────────────────────────────────────────────────────────────

/**
 * Sube o baja un elemento dentro de su grupo (las categorías entre sí, los
 * productos de la misma categoría, los extras entre sí) intercambiando
 * posiciones con su vecino.
 *
 * @param {Menu} menu
 * @param {'categories' | 'products' | 'extras'} collection
 * @param {string} id
 * @param {'up' | 'down'} direction
 */
export function moveItem(menu, collection, id, direction) {
  if (!COLLECTIONS.includes(collection)) {
    throw new MenuError(MENU_ERROR.INVALID_COLLECTION, 'La lista no es válida');
  }
  if (direction !== 'up' && direction !== 'down') {
    throw new MenuError(MENU_ERROR.INVALID_DIRECTION, 'La dirección debe ser arriba o abajo');
  }

  const codes = {
    categories: [MENU_ERROR.CATEGORY_NOT_FOUND, 'La categoría'],
    products: [MENU_ERROR.PRODUCT_NOT_FOUND, 'El producto'],
    extras: [MENU_ERROR.EXTRA_NOT_FOUND, 'El extra'],
  };
  const items = menu[collection];
  const target = findOrThrow(items, id, ...codes[collection]);

  const inGroup = (item) =>
    collection === MENU_COLLECTION.PRODUCTS ? item.categoryId === target.categoryId : true;

  const group = items.filter(inGroup).sort((a, b) => a.sortOrder - b.sortOrder);
  const index = group.findIndex((item) => item.id === id);
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= group.length) return menu; // ya está en el extremo

  const reordered = [...group];
  [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];
  const positions = new Map(reordered.map((item, position) => [item.id, position + 1]));

  return {
    ...menu,
    [collection]: items.map((item) =>
      positions.has(item.id) ? { ...item, sortOrder: positions.get(item.id) } : item,
    ),
  };
}

// ── Observaciones frecuentes ───────────────────────────────────────────────

/**
 * @param {Menu} menu
 * @param {string} text
 */
export function addQuickNote(menu, text) {
  const note = cleanNote(text);
  if (menu.quickNotes.some((existing) => nameKey(existing) === nameKey(note))) {
    throw new MenuError(MENU_ERROR.DUPLICATE_NOTE, `Ya existe la observación "${note}"`);
  }
  return { ...menu, quickNotes: [...menu.quickNotes, note] };
}

/**
 * @param {Menu} menu
 * @param {string} text
 */
export function removeQuickNote(menu, text) {
  if (!menu.quickNotes.includes(text)) {
    throw new MenuError(MENU_ERROR.NOTE_NOT_FOUND, 'La observación no existe');
  }
  return { ...menu, quickNotes: menu.quickNotes.filter((note) => note !== text) };
}

// ── Menú de ejemplo ────────────────────────────────────────────────────────

/**
 * Reemplaza un menú VACÍO por uno de ejemplo, para arrancar rápido y editarlo.
 * @param {Menu} menu
 * @param {Menu} sample
 */
export function loadSampleMenu(menu, sample) {
  if (!isMenuEmpty(menu)) {
    throw new MenuError(
      MENU_ERROR.MENU_NOT_EMPTY,
      'El menú de ejemplo solo se puede cargar cuando el menú está vacío',
    );
  }
  return { ...normalizeMenu(JSON.parse(JSON.stringify(sample))), quickNotes: [...sample.quickNotes] };
}
