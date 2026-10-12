import { PGlite } from '@electric-sql/pglite';
import { MENU_ERROR, createCategory, createProduct, emptyMenu, updateProduct } from '@/domain/menu';
import { createMemoryMenuStore } from './createMemoryMenuStore';
import { createPostgresMenuStore } from './createPostgresMenuStore';

async function createPgliteStore() {
  const pglite = new PGlite();
  const store = createPostgresMenuStore({
    query: (text, params) => pglite.query(text, params),
    transaction: (fn) => pglite.transaction((tx) => fn(tx)),
    close: () => pglite.close(),
  });
  await store.init();
  return store;
}

// El mismo contrato debe cumplirse con memoria y con Postgres.
describe.each([
  ['memoria', async () => createMemoryMenuStore()],
  ['Postgres', createPgliteStore],
])('MenuStore (%s)', (_name, createStore) => {
  let store;

  beforeEach(async () => {
    store = await createStore();
  });

  afterEach(async () => {
    await store.close();
  });

  const addCategory = (name, id) => (menu) => createCategory(menu, { name }, { id });

  it('empieza vacío', async () => {
    expect(await store.getMenu()).toEqual(emptyMenu());
  });

  it('guarda los cambios y los devuelve', async () => {
    const saved = await store.updateMenu(addCategory('Platillos', 'cat-1'));

    expect(saved.categories.map((c) => c.name)).toEqual(['Platillos']);
    expect((await store.getMenu()).categories).toHaveLength(1);
  });

  it('un cambio rechazado por el dominio no guarda nada', async () => {
    await store.updateMenu(addCategory('Platillos', 'cat-1'));

    await expect(store.updateMenu(addCategory('platillos', 'cat-2'))).rejects.toMatchObject({
      code: MENU_ERROR.DUPLICATE_NAME,
    });

    expect((await store.getMenu()).categories).toHaveLength(1);
  });

  it('cambios simultáneos se aplican uno tras otro sin perder ninguno', async () => {
    await store.updateMenu(addCategory('Platillos', 'cat-1'));

    await Promise.all(
      ['Arroz', 'Pollo', 'Sopa', 'Ensalada', 'Postre'].map((name, index) =>
        store.updateMenu((menu) =>
          createProduct(menu, { categoryId: 'cat-1', name, kind: 'dish', price: 1000 + index }, { id: `p-${index}` }),
        ),
      ),
    );

    const menu = await store.getMenu();
    expect(menu.products).toHaveLength(5);
    // Orden consecutivo, sin repetidos: nadie leyó un estado viejo.
    expect(menu.products.map((p) => p.sortOrder).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it('conserva todos los campos (JSONB reordena claves, no datos)', async () => {
    await store.updateMenu(addCategory('Platillos', 'cat-1'));
    await store.updateMenu((menu) =>
      createProduct(menu, { categoryId: 'cat-1', name: 'Casado', kind: 'dish', price: 3500 }, { id: 'p-1' }),
    );
    await store.updateMenu((menu) => updateProduct(menu, 'p-1', { price: 3700, active: false }));

    const [product] = (await store.getMenu()).products;
    expect(product).toMatchObject({
      id: 'p-1',
      name: 'Casado',
      kind: 'dish',
      price: 3700,
      active: false,
      categoryId: 'cat-1',
      extraIds: [],
    });
  });
});
