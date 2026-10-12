import { MENU_ERROR, emptyMenu } from '@/domain/menu';
import { ROLES } from '@/domain/users';
import { createMemoryMenuRepository } from './createMemoryMenuRepository';

const admin = { id: 'a', name: 'Admin', role: ROLES.ADMIN };
const cashier = { id: 'c', name: 'Caja', role: ROLES.CASHIER };
const cook = { id: 'k', name: 'Cocina', role: ROLES.COOK };

function setup(actor = admin, initial = emptyMenu()) {
  let current = actor;
  const repo = createMemoryMenuRepository({ initial, getActor: () => current });
  return { repo, as: (next) => (current = next) };
}

describe('menú en memoria', () => {
  it('el administrador crea, edita y elimina; cada cambio avisa a los suscritos', async () => {
    const { repo } = setup();
    const events = [];
    repo.subscribe((event) => events.push(event));

    const category = await repo.create('categories', { name: 'Platillos' });
    const product = await repo.create('products', {
      categoryId: category.id,
      name: 'Casado',
      kind: 'dish',
      price: 3500,
    });
    await repo.update('products', product.id, { price: 3800 });
    const menu = await repo.getMenu();

    expect(menu.products[0]).toMatchObject({ name: 'Casado', price: 3800 });
    expect(events.filter((e) => e.type === 'menu:changed')).toHaveLength(3);

    await repo.remove('products', product.id);
    expect((await repo.getMenu()).products).toEqual([]);
  });

  it('una operación rechazada no cambia el menú ni avisa', async () => {
    const { repo } = setup();
    const listener = jest.fn();
    await repo.create('categories', { name: 'Platillos' });
    repo.subscribe(listener);

    await expect(repo.create('categories', { name: 'PLATILLOS' })).rejects.toMatchObject({
      code: MENU_ERROR.DUPLICATE_NAME,
    });

    expect((await repo.getMenu()).categories).toHaveLength(1);
    expect(listener).not.toHaveBeenCalled();
  });

  it('caja puede leer el menú pero no modificarlo; cocina no lo ve', async () => {
    const { repo, as } = setup(admin);
    await repo.create('categories', { name: 'Platillos' });

    as(cashier);
    expect((await repo.getMenu()).categories).toHaveLength(1);
    await expect(repo.create('categories', { name: 'Otra' })).rejects.toMatchObject({ code: MENU_ERROR.FORBIDDEN });
    await expect(repo.loadSample()).rejects.toMatchObject({ code: MENU_ERROR.FORBIDDEN });

    as(cook);
    await expect(repo.getMenu()).rejects.toMatchObject({ code: MENU_ERROR.FORBIDDEN });

    as(null);
    await expect(repo.getMenu()).rejects.toMatchObject({ code: MENU_ERROR.UNAUTHORIZED });
  });

  it('el menú de ejemplo solo carga con el menú vacío', async () => {
    const { repo } = setup();
    const loaded = await repo.loadSample();
    expect(loaded.products.length).toBeGreaterThan(0);
    await expect(repo.loadSample()).rejects.toMatchObject({ code: MENU_ERROR.MENU_NOT_EMPTY });
  });

  it('no comparte estado con el menú inicial', async () => {
    const initial = emptyMenu();
    const { repo } = setup(admin, initial);
    await repo.create('categories', { name: 'Platillos' });
    expect(initial.categories).toEqual([]);
  });
});
