import { menuSeed } from '@/data/seed/menu';
import {
  MENU_COLLECTION,
  MENU_ERROR,
  PRODUCT_KIND,
  addQuickNote,
  createCategory,
  createExtra,
  createProduct,
  deleteCategory,
  deleteExtra,
  deleteProduct,
  emptyMenu,
  getSellableCategories,
  isMenuEmpty,
  loadSampleMenu,
  moveItem,
  normalizeMenu,
  removeQuickNote,
  updateCategory,
  updateExtra,
  updateProduct,
} from '@/domain/menu';

function expectMenuError(fn, code) {
  try {
    fn();
  } catch (error) {
    expect(error.code).toBe(code);
    return;
  }
  throw new Error(`Se esperaba MenuError ${code}`);
}

/** Menú pequeño y conocido para las pruebas. */
function buildMenu() {
  let menu = emptyMenu();
  menu = createCategory(menu, { name: 'Platillos', icon: 'restaurant' }, { id: 'cat-a' });
  menu = createCategory(menu, { name: 'Bebidas', icon: 'cafe' }, { id: 'cat-b' });
  menu = createExtra(menu, { name: 'Queso', price: 500 }, { id: 'ex-1' });
  menu = createExtra(menu, { name: 'Tocino', price: 700 }, { id: 'ex-2' });
  menu = createProduct(
    menu,
    { categoryId: 'cat-a', name: 'Casado', kind: 'dish', price: 3500, extraIds: ['ex-1'] },
    { id: 'p-1' },
  );
  menu = createProduct(
    menu,
    { categoryId: 'cat-a', name: 'Arroz con pollo', kind: 'dish', price: 3000 },
    { id: 'p-2' },
  );
  menu = createProduct(
    menu,
    { categoryId: 'cat-b', name: 'Fresco', kind: 'drink', price: 1200 },
    { id: 'p-3' },
  );
  return menu;
}

describe('crear', () => {
  it('agrega platillos y bebidas con orden consecutivo dentro de su categoría', () => {
    const menu = buildMenu();

    expect(menu.products.find((p) => p.id === 'p-1')).toMatchObject({
      name: 'Casado',
      kind: PRODUCT_KIND.DISH,
      price: 3500,
      extraIds: ['ex-1'],
      sortOrder: 1,
      active: true,
    });
    expect(menu.products.find((p) => p.id === 'p-2').sortOrder).toBe(2);
    // La bebida es la primera de OTRA categoría.
    expect(menu.products.find((p) => p.id === 'p-3').sortOrder).toBe(1);
    expect(menu.extras.map((e) => e.sortOrder)).toEqual([1, 2]);
  });

  it('limpia espacios en los nombres', () => {
    const menu = createExtra(emptyMenu(), { name: '   Salsa    picante  ', price: 300 });
    expect(menu.extras[0].name).toBe('Salsa picante');
  });

  it('genera un id si no se da', () => {
    const menu = createCategory(emptyMenu(), { name: 'Postres' });
    expect(menu.categories[0].id).toMatch(/^cat_/);
  });

  it('rechaza nombres vacíos o demasiado largos', () => {
    expectMenuError(() => createCategory(emptyMenu(), { name: '   ' }), MENU_ERROR.INVALID_NAME);
    expectMenuError(() => createExtra(emptyMenu(), { name: 'x'.repeat(61), price: 1 }), MENU_ERROR.INVALID_NAME);
  });

  it('rechaza precios que no sean colones enteros entre 0 y el máximo', () => {
    const menu = buildMenu();
    const input = { categoryId: 'cat-a', name: 'Nuevo', kind: 'dish' };
    expectMenuError(() => createProduct(menu, { ...input, price: -1 }), MENU_ERROR.INVALID_PRICE);
    expectMenuError(() => createProduct(menu, { ...input, price: 10.5 }), MENU_ERROR.INVALID_PRICE);
    expectMenuError(() => createProduct(menu, { ...input, price: '2000' }), MENU_ERROR.INVALID_PRICE);
    expectMenuError(() => createProduct(menu, { ...input, price: 10_000_000 }), MENU_ERROR.INVALID_PRICE);
    expect(createProduct(menu, { ...input, price: 0 }).products).toHaveLength(4); // gratis es válido
  });

  it('exige tipo válido, categoría existente y extras existentes', () => {
    const menu = buildMenu();
    const base = { categoryId: 'cat-a', name: 'Nuevo', kind: 'dish', price: 1000 };
    expectMenuError(() => createProduct(menu, { ...base, kind: 'postre' }), MENU_ERROR.INVALID_KIND);
    expectMenuError(() => createProduct(menu, { ...base, categoryId: 'nada' }), MENU_ERROR.CATEGORY_NOT_FOUND);
    expectMenuError(() => createProduct(menu, { ...base, extraIds: ['ex-9'] }), MENU_ERROR.EXTRA_NOT_FOUND);
  });

  it('no permite nombres repetidos (sin distinguir mayúsculas) donde estorban', () => {
    const menu = buildMenu();
    expectMenuError(() => createCategory(menu, { name: 'platillos' }), MENU_ERROR.DUPLICATE_NAME);
    expectMenuError(() => createExtra(menu, { name: 'QUESO', price: 1 }), MENU_ERROR.DUPLICATE_NAME);
    expectMenuError(
      () => createProduct(menu, { categoryId: 'cat-a', name: 'casado', kind: 'dish', price: 1 }),
      MENU_ERROR.DUPLICATE_NAME,
    );
    // El mismo nombre en OTRA categoría sí se permite.
    expect(
      createProduct(menu, { categoryId: 'cat-b', name: 'Casado', kind: 'dish', price: 1 }).products,
    ).toHaveLength(4);
  });

  it('valida el icono de la categoría', () => {
    expectMenuError(() => createCategory(emptyMenu(), { name: 'X', icon: 'no-existe' }), MENU_ERROR.INVALID_ICON);
    expect(createCategory(emptyMenu(), { name: 'X' }).categories[0].icon).toBeNull();
  });

  it('es inmutable: no modifica el menú original', () => {
    const menu = buildMenu();
    const snapshot = JSON.stringify(menu);
    createProduct(menu, { categoryId: 'cat-a', name: 'Otro', kind: 'dish', price: 1 });
    updateProduct(menu, 'p-1', { price: 9999 });
    expect(JSON.stringify(menu)).toBe(snapshot);
  });
});

describe('editar', () => {
  it('cambia solo los campos indicados', () => {
    const menu = updateProduct(buildMenu(), 'p-1', { price: 4000, name: 'Casado especial' });
    expect(menu.products.find((p) => p.id === 'p-1')).toMatchObject({
      name: 'Casado especial',
      price: 4000,
      kind: 'dish',
      categoryId: 'cat-a',
      extraIds: ['ex-1'],
    });
  });

  it('puede cambiar de categoría y queda al final de la nueva', () => {
    const menu = updateProduct(buildMenu(), 'p-1', { categoryId: 'cat-b' });
    const moved = menu.products.find((p) => p.id === 'p-1');
    expect(moved.categoryId).toBe('cat-b');
    expect(moved.sortOrder).toBe(2); // después de "Fresco"
  });

  it('reemplaza la lista de extras y quita repetidos', () => {
    const menu = updateProduct(buildMenu(), 'p-1', { extraIds: ['ex-2', 'ex-1', 'ex-2'] });
    expect(menu.products.find((p) => p.id === 'p-1').extraIds).toEqual(['ex-2', 'ex-1']);
  });

  it('permite ocultar y volver a mostrar', () => {
    let menu = updateProduct(buildMenu(), 'p-1', { active: false });
    expect(menu.products.find((p) => p.id === 'p-1').active).toBe(false);
    menu = updateProduct(menu, 'p-1', { active: true });
    expect(menu.products.find((p) => p.id === 'p-1').active).toBe(true);
    expectMenuError(() => updateProduct(menu, 'p-1', { active: 'si' }), MENU_ERROR.INVALID_ACTIVE);
  });

  it('un nombre repetido al editar se rechaza, pero conservar el propio es válido', () => {
    const menu = buildMenu();
    expectMenuError(() => updateProduct(menu, 'p-2', { name: 'Casado' }), MENU_ERROR.DUPLICATE_NAME);
    expect(updateProduct(menu, 'p-1', { name: 'Casado', price: 3600 }).products).toHaveLength(3);
  });

  it('rechaza ids que no existen', () => {
    const menu = buildMenu();
    expectMenuError(() => updateProduct(menu, 'zzz', { price: 1 }), MENU_ERROR.PRODUCT_NOT_FOUND);
    expectMenuError(() => updateCategory(menu, 'zzz', { name: 'x' }), MENU_ERROR.CATEGORY_NOT_FOUND);
    expectMenuError(() => updateExtra(menu, 'zzz', { price: 1 }), MENU_ERROR.EXTRA_NOT_FOUND);
  });

  it('edita categorías y extras', () => {
    let menu = updateCategory(buildMenu(), 'cat-a', { name: 'Comidas', icon: 'pizza', active: false });
    expect(menu.categories.find((c) => c.id === 'cat-a')).toMatchObject({
      name: 'Comidas',
      icon: 'pizza',
      active: false,
    });
    menu = updateExtra(menu, 'ex-1', { price: 600, active: false });
    expect(menu.extras.find((e) => e.id === 'ex-1')).toMatchObject({ price: 600, active: false });
  });
});

describe('eliminar', () => {
  it('elimina un producto', () => {
    const menu = deleteProduct(buildMenu(), 'p-3');
    expect(menu.products.map((p) => p.id)).toEqual(['p-1', 'p-2']);
  });

  it('al eliminar un extra lo quita de los productos que lo ofrecían', () => {
    const menu = deleteExtra(buildMenu(), 'ex-1');
    expect(menu.extras.map((e) => e.id)).toEqual(['ex-2']);
    expect(menu.products.find((p) => p.id === 'p-1').extraIds).toEqual([]);
  });

  it('no deja eliminar una categoría con productos; vacía sí', () => {
    const menu = buildMenu();
    expectMenuError(() => deleteCategory(menu, 'cat-a'), MENU_ERROR.CATEGORY_NOT_EMPTY);

    const emptied = deleteProduct(menu, 'p-3');
    expect(deleteCategory(emptied, 'cat-b').categories.map((c) => c.id)).toEqual(['cat-a']);
  });

  it('rechaza eliminar lo que no existe', () => {
    const menu = buildMenu();
    expectMenuError(() => deleteProduct(menu, 'zzz'), MENU_ERROR.PRODUCT_NOT_FOUND);
    expectMenuError(() => deleteExtra(menu, 'zzz'), MENU_ERROR.EXTRA_NOT_FOUND);
    expectMenuError(() => deleteCategory(menu, 'zzz'), MENU_ERROR.CATEGORY_NOT_FOUND);
  });
});

describe('orden', () => {
  const order = (menu, collection, group = () => true) =>
    [...menu[collection]].filter(group).sort((a, b) => a.sortOrder - b.sortOrder).map((i) => i.id);

  it('sube y baja un producto dentro de su categoría', () => {
    let menu = moveItem(buildMenu(), MENU_COLLECTION.PRODUCTS, 'p-2', 'up');
    expect(order(menu, 'products', (p) => p.categoryId === 'cat-a')).toEqual(['p-2', 'p-1']);

    menu = moveItem(menu, MENU_COLLECTION.PRODUCTS, 'p-2', 'down');
    expect(order(menu, 'products', (p) => p.categoryId === 'cat-a')).toEqual(['p-1', 'p-2']);
  });

  it('no cambia nada en los extremos y no toca otras categorías', () => {
    const menu = buildMenu();
    expect(moveItem(menu, 'products', 'p-1', 'up')).toBe(menu);
    expect(moveItem(menu, 'products', 'p-2', 'down')).toBe(menu);

    const moved = moveItem(menu, 'products', 'p-2', 'up');
    expect(moved.products.find((p) => p.id === 'p-3').sortOrder).toBe(1);
  });

  it('ordena categorías y extras', () => {
    let menu = moveItem(buildMenu(), 'categories', 'cat-b', 'up');
    expect(order(menu, 'categories')).toEqual(['cat-b', 'cat-a']);
    menu = moveItem(menu, 'extras', 'ex-2', 'up');
    expect(order(menu, 'extras')).toEqual(['ex-2', 'ex-1']);
  });

  it('valida lista y dirección', () => {
    const menu = buildMenu();
    expectMenuError(() => moveItem(menu, 'otra', 'p-1', 'up'), MENU_ERROR.INVALID_COLLECTION);
    expectMenuError(() => moveItem(menu, 'products', 'p-1', 'izquierda'), MENU_ERROR.INVALID_DIRECTION);
    expectMenuError(() => moveItem(menu, 'products', 'zzz', 'up'), MENU_ERROR.PRODUCT_NOT_FOUND);
  });
});

describe('observaciones frecuentes', () => {
  it('agrega y quita', () => {
    let menu = addQuickNote(emptyMenu(), '  Sin   cebolla ');
    expect(menu.quickNotes).toEqual(['Sin cebolla']);
    menu = removeQuickNote(menu, 'Sin cebolla');
    expect(menu.quickNotes).toEqual([]);
  });

  it('rechaza repetidas, vacías y las que no existen', () => {
    const menu = addQuickNote(emptyMenu(), 'Sin cebolla');
    expectMenuError(() => addQuickNote(menu, 'sin CEBOLLA'), MENU_ERROR.DUPLICATE_NOTE);
    expectMenuError(() => addQuickNote(menu, '  '), MENU_ERROR.INVALID_NOTE);
    expectMenuError(() => removeQuickNote(menu, 'otra'), MENU_ERROR.NOTE_NOT_FOUND);
  });
});

describe('menú de ejemplo y consultas', () => {
  it('se carga solo si el menú está vacío', () => {
    const loaded = loadSampleMenu(emptyMenu(), menuSeed);
    expect(isMenuEmpty(loaded)).toBe(false);
    expect(loaded.products.length).toBe(menuSeed.products.length);
    expectMenuError(() => loadSampleMenu(loaded, menuSeed), MENU_ERROR.MENU_NOT_EMPTY);
  });

  it('el menú cargado es una copia: editarlo no altera el ejemplo', () => {
    const loaded = loadSampleMenu(emptyMenu(), menuSeed);
    loaded.products[0].price = 1;
    expect(menuSeed.products[0].price).not.toBe(1);
  });

  it('normalizeMenu completa lo que falte', () => {
    const menu = normalizeMenu({ extras: [{ id: 'e', name: 'E', price: 1, active: true }] });
    expect(menu.categories).toEqual([]);
    expect(menu.extras[0].sortOrder).toBe(1);
  });

  it('el cajero solo ve categorías activas con productos activos', () => {
    let menu = buildMenu();
    expect(getSellableCategories(menu).map((c) => c.id)).toEqual(['cat-a', 'cat-b']);

    menu = updateProduct(menu, 'p-3', { active: false });
    expect(getSellableCategories(menu).map((c) => c.id)).toEqual(['cat-a']);

    menu = updateCategory(menu, 'cat-a', { active: false });
    expect(getSellableCategories(menu)).toEqual([]);
  });
});
