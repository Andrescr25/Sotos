/**
 * Flujo del administrador sobre el inventario, en modo memoria: crear un
 * insumo, definir la receta de un platillo, ver que una venta rebaja la porción
 * correcta sin recargar, y ajustar el stock. Es un flujo continuo: el orden de
 * los casos importa y comparten el mismo estado de datos.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import AdminScreen from '@/features/admin/screens/AdminScreen';
import InventoryScreen from '@/features/admin/screens/InventoryScreen';
import { AuthProvider } from '@/features/auth';
import { menuSeed } from '@/data/seed/menu';
import { usersSeed } from '@/data/seed/users';
import { findProduct } from '@/domain/menu';
import { addItem, createDraftOrder, createOrderItem, setCustomerName } from '@/domain/orders';
import { PAYMENT_METHOD } from '@/domain/payments';
import { authService, inventoryService, orderService } from '@/services';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

const named = (name) =>
  typeof name === 'string' ? new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : name;
const button = (name, scope = screen) => scope.getByRole('button', { name: named(name) });
const press = (name, scope = screen) => fireEvent.press(button(name, scope));
const exact = (name, scope = screen) => scope.getByRole('button', { name });

const renderWithAuth = (element) => render(<AuthProvider>{element}</AuthProvider>);

async function signInAs(username, password) {
  await authService.logout();
  await authService.login({ username, password });
}

const formSheet = (testID) => within(screen.getByTestId(testID));
const sheetClosed = (testID) => waitFor(() => expect(screen.queryByTestId(testID)).toBeNull());

/**
 * Una venta de `quantity` papas (₡1.500) como la haría Caja. La firma quien tiene
 * la sesión abierta (aquí el administrador, que también puede cobrar).
 */
async function sellPapas(quantity) {
  const seller = usersSeed.find((user) => user.role === 'admin');
  const draft = addItem(
    setCustomerName(createDraftOrder({ createdBy: seller }), 'Luis Rojas'),
    createOrderItem({ product: findProduct(menuSeed, 'prod-papas'), quantity }),
  );
  return orderService.sendToKitchen(draft, seller, { method: PAYMENT_METHOD.CARD });
}

describe('inventario del administrador', () => {
  it('sin insumos explica cómo funciona y ofrece crear el primero', async () => {
    await signInAs('admin', 'admin123');
    await renderWithAuth(<InventoryScreen />);

    expect(await screen.findByText('Todavía no hay insumos')).toBeTruthy();
    expect(screen.getByText(/cada venta rebaja esas porciones sola/)).toBeTruthy();
    expect(button('Crear mi primer insumo')).toBeTruthy();
    ['Insumos', 'Recetas'].forEach((tab) => expect(button(tab)).toBeTruthy());
  });

  it('valida lo que escribe: nombre, unidad y porciones enteras', async () => {
    await signInAs('admin', 'admin123');
    await renderWithAuth(<InventoryScreen />);
    await screen.findByText('Todavía no hay insumos');

    await press('Crear mi primer insumo');
    const form = formSheet('inventory-item-form');

    await fireEvent.press(button('Guardar', form));
    expect(await form.findByText('Escribe el nombre del insumo.')).toBeTruthy();

    await fireEvent.changeText(form.getByLabelText('Nombre'), 'Papas');
    await fireEvent.press(button('Guardar', form));
    expect(await form.findByText('Escribe la unidad: paquete, kg, botella…')).toBeTruthy();

    await fireEvent.changeText(form.getByLabelText('Unidad (cómo lo compras o lo cuentas)'), 'paquete');
    await fireEvent.changeText(form.getByLabelText(/Cuántas porciones/), '1.5');
    await fireEvent.press(button('Guardar', form));
    expect(await form.findByText(/porciones por unidad deben ser un número entero/)).toBeTruthy();

    await fireEvent.press(form.getByRole('button', { name: 'Cerrar' }));
    await sheetClosed('inventory-item-form');
  });

  it('crea "Papas": un paquete rinde 8 porciones y hay 3 paquetes', async () => {
    await signInAs('admin', 'admin123');
    await renderWithAuth(<InventoryScreen />);
    await screen.findByText('Todavía no hay insumos');

    await press('Nuevo insumo');
    const form = formSheet('inventory-item-form');
    await fireEvent.changeText(form.getByLabelText('Nombre'), 'Papas');
    await fireEvent.changeText(form.getByLabelText('Unidad (cómo lo compras o lo cuentas)'), 'paquete');
    await fireEvent.changeText(form.getByLabelText(/Cuántas porciones/), '8');
    await fireEvent.changeText(form.getByLabelText('paquetes completos'), '3');
    await fireEvent.changeText(form.getByLabelText(/Avisar cuando queden menos/), '6');
    expect(form.getByText('En total: 24 porciones.')).toBeTruthy();
    await fireEvent.press(button('Guardar', form));

    await sheetClosed('inventory-item-form');
    expect(await screen.findByText('Papas')).toBeTruthy();
    expect(screen.getByText('8 porciones por paquete')).toBeTruthy();
    expect(screen.getByText('3 paquetes')).toBeTruthy();
    expect(screen.getByText('24 porciones')).toBeTruthy();
    expect(screen.queryByText('Por reponer')).toBeNull();
  });

  it('define la receta: el plato de papas usa 1/8 de paquete', async () => {
    await signInAs('admin', 'admin123');
    await renderWithAuth(<InventoryScreen />);
    await screen.findByText('Papas');

    await press('Recetas');
    expect((await screen.findAllByText('Sin receta: no descuenta inventario')).length).toBeGreaterThan(0);

    await fireEvent.press(exact('Agregar receta de Papas'));
    const form = formSheet('recipe-form');
    expect(form.getByText('No se usa')).toBeTruthy();
    await fireEvent.press(form.getByRole('button', { name: 'Aumentar cantidad' }));
    expect(form.getByText('Usa 1/8 de paquete')).toBeTruthy();
    await fireEvent.press(button('Guardar receta', form));

    await sheetClosed('recipe-form');
    expect(await screen.findByText('Papas: 1/8 de paquete')).toBeTruthy();
    expect(exact('Editar receta de Papas')).toBeTruthy();
  });

  it('una venta rebaja 1/8 del paquete y la pantalla abierta se actualiza sola', async () => {
    await signInAs('admin', 'admin123');
    await renderWithAuth(<InventoryScreen />);
    expect(await screen.findByText('3 paquetes')).toBeTruthy();

    // Caja vende 1 plato de papas mientras esta pantalla sigue abierta.
    await sellPapas(1);

    expect(await screen.findByText('2 y 7/8 paquetes')).toBeTruthy();
    expect(screen.getByText('23 porciones')).toBeTruthy();

    await sellPapas(3);
    expect(await screen.findByText('2 y 1/2 paquetes')).toBeTruthy();
    expect(screen.getByText('20 porciones')).toBeTruthy();
  });

  it('ajusta el stock: entró mercadería, merma y conteo, viendo cómo quedará', async () => {
    await signInAs('admin', 'admin123');
    await renderWithAuth(<InventoryScreen />);
    await screen.findByText('2 y 1/2 paquetes');

    // Entró 1 paquete y 2 porciones sueltas.
    await press('Ajustar stock de Papas');
    let form = formSheet('stock-adjust-form');
    expect(form.getByText('Ahora: 2 y 1/2 paquetes (20 porciones)')).toBeTruthy();
    expect(button('Guardar ajuste', form).props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(form.getByLabelText(/Cantidad/), '1');
    await fireEvent.changeText(form.getByLabelText('Porciones sueltas'), '2');
    expect(form.getByText('Quedará: 3 y 3/4 paquetes (30 porciones)')).toBeTruthy();
    await fireEvent.press(button('Guardar ajuste', form));
    await sheetClosed('stock-adjust-form');
    expect(await screen.findByText('30 porciones')).toBeTruthy();

    // Merma: se cayeron 6 porciones.
    await press('Ajustar stock de Papas');
    form = formSheet('stock-adjust-form');
    await fireEvent.press(button('Merma o salida', form));
    await fireEvent.changeText(form.getByLabelText('Porciones sueltas'), '6');
    expect(form.getByText('Quedará: 3 paquetes (24 porciones)')).toBeTruthy();
    await fireEvent.press(button('Guardar ajuste', form));
    await sheetClosed('stock-adjust-form');
    expect(await screen.findByText('24 porciones')).toBeTruthy();

    // Conteo físico: en la bodega solo hay 5 porciones; queda bajo el mínimo (6).
    await press('Ajustar stock de Papas');
    form = formSheet('stock-adjust-form');
    await fireEvent.press(button('Conteo físico', form));
    await fireEvent.changeText(form.getByLabelText('Porciones sueltas'), '5');
    await fireEvent.press(button('Guardar ajuste', form));
    await sheetClosed('stock-adjust-form');
    expect(await screen.findByText('5/8 de paquete')).toBeTruthy();
    expect(screen.getByText('5 porciones')).toBeTruthy();
    expect(screen.getByText('Por reponer')).toBeTruthy();
    expect(screen.getByText('1 insumo está agotado o por reponer.')).toBeTruthy();
  });

  it('vender sin stock no se bloquea y se lee como faltante', async () => {
    await signInAs('admin', 'admin123');
    await renderWithAuth(<InventoryScreen />);
    await screen.findByText('5/8 de paquete');

    await sellPapas(7); // 5 porciones y se venden 7

    expect(await screen.findByText('Faltan 1/4 de paquete')).toBeTruthy(); // 5 − 7 = −2 porciones = 2/8
    expect(screen.getByText('-2 porciones')).toBeTruthy();
    expect(screen.getByText('Agotado')).toBeTruthy();
  });

  it('el inicio de administración cuenta los insumos por reponer', async () => {
    await signInAs('admin', 'admin123');
    await renderWithAuth(<AdminScreen />);

    expect(await screen.findByText('Insumos por reponer')).toBeTruthy();
    expect(screen.getByText('Agotados o bajo el mínimo')).toBeTruthy();
    expect(exact('Inventario')).toBeTruthy(); // la tarjeta de acceso (la navegación se llama "Ir a Inventario")
    // El insumo "Papas" quedó agotado en el caso anterior: hay 1 por reponer.
    const card = screen.getByText('Insumos por reponer').parent.parent;
    await waitFor(() => expect(within(card).getByText('1')).toBeTruthy());
  });

  it('editar y eliminar el insumo lo quita también de las recetas', async () => {
    await signInAs('admin', 'admin123');
    await renderWithAuth(<InventoryScreen />);
    await screen.findByText('Papas');

    await fireEvent.press(exact('Editar Papas'));
    const form = formSheet('inventory-item-form');
    await fireEvent.changeText(form.getByLabelText('Nombre'), 'Papas congeladas');
    await fireEvent.press(button('Guardar', form));
    await sheetClosed('inventory-item-form');
    expect(await screen.findByText('Papas congeladas')).toBeTruthy();

    await fireEvent.press(exact('Editar Papas congeladas'));
    const edit = formSheet('inventory-item-form');
    await fireEvent.press(button('Eliminar insumo', edit));
    await fireEvent.press(button('Sí, eliminar', edit));
    await sheetClosed('inventory-item-form');
    expect(await screen.findByText('Todavía no hay insumos')).toBeTruthy();

    await press('Recetas');
    expect((await inventoryService.getInventory()).recipes.products).toEqual({});
  });

  it('el cajero no puede ver ni modificar el inventario', async () => {
    await signInAs('cajero', 'cajero123');

    await expect(inventoryService.getInventory()).rejects.toMatchObject({ code: 'forbidden' });
    await expect(inventoryService.createItem({ name: 'Sal', unit: 'kg', portionsPerUnit: 1 })).rejects.toMatchObject({
      code: 'forbidden',
    });
    await authService.logout();
  });
});
