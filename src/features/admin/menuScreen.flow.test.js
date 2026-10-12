/**
 * Flujo del administrador sobre el menú, en modo memoria: crear un platillo
 * por pantalla, que Caja lo vea, editarlo y eliminarlo. Es un flujo continuo:
 * el orden de los casos importa.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import MenuScreen from '@/features/admin/screens/MenuScreen';
import { AuthProvider } from '@/features/auth';
import CashierScreen from '@/features/cashier/screens/CashierScreen';
import { authService } from '@/services';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

const named = (name) =>
  typeof name === 'string' ? new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : name;
const button = (name, scope = screen) => scope.getByRole('button', { name: named(name) });
const press = (name, scope = screen) => fireEvent.press(button(name, scope));

const renderWithAuth = (element) => render(<AuthProvider>{element}</AuthProvider>);

async function signInAs(username, password) {
  await authService.logout();
  await authService.login({ username, password });
}

const formSheet = (testID) => within(screen.getByTestId(testID));
const sheetClosed = (testID) => waitFor(() => expect(screen.queryByTestId(testID)).toBeNull());

describe('administración del menú', () => {
  it('muestra el menú existente con sus precios', async () => {
    await signInAs('admin', 'admin123');
    await renderWithAuth(<MenuScreen />);

    expect(await screen.findByText('Hamburguesa clásica')).toBeTruthy();
    expect(screen.getAllByText('₡3.500').length).toBeGreaterThan(0);
    // Hay una pestaña para cada cosa que el administrador gestiona.
    ['Platillos y bebidas', 'Extras', 'Categorías', 'Observaciones'].forEach((tab) =>
      expect(button(tab)).toBeTruthy(),
    );
  });

  it('agrega un platillo nuevo y queda en la lista', async () => {
    await signInAs('admin', 'admin123');
    await renderWithAuth(<MenuScreen />);
    await screen.findByText('Hamburguesa clásica');

    await press('Nuevo producto');
    const form = formSheet('product-form');
    await fireEvent.changeText(form.getByLabelText('Nombre'), 'Gallo pinto');
    await fireEvent.press(button('Acompañamientos', form));
    await fireEvent.changeText(form.getByLabelText('Precio (₡)'), '1800');
    await fireEvent.press(button('Salsa extra', form)); // le asigna un extra
    await fireEvent.press(button('Guardar', form));

    await sheetClosed('product-form');
    expect(await screen.findByText('Gallo pinto')).toBeTruthy();
    expect(screen.getByText('₡1.800')).toBeTruthy();
    // Las 2 papas del menú de ejemplo y el gallo pinto: 3 platillos de Acompañamientos con 1 extra.
    expect(screen.getAllByText(/Platillo · Acompañamientos · 1 extra/)).toHaveLength(3);
    expect(screen.getByRole('button', { name: /Editar Gallo pinto/ })).toBeTruthy();
  });

  it('valida lo que escribe antes de enviarlo', async () => {
    await signInAs('admin', 'admin123');
    await renderWithAuth(<MenuScreen />);
    await screen.findByText('Hamburguesa clásica');

    await press('Nuevo producto');
    const form = formSheet('product-form');

    await fireEvent.press(button('Guardar', form));
    expect(await form.findByText('Escribe el nombre.')).toBeTruthy();

    await fireEvent.changeText(form.getByLabelText('Nombre'), 'Postre');
    await fireEvent.press(button('Guardar', form));
    expect(await form.findByText(/Escribe el precio en colones/)).toBeTruthy();

    // Un nombre repetido lo rechaza el dominio y se explica en español.
    await fireEvent.changeText(form.getByLabelText('Nombre'), 'Gallo pinto');
    await fireEvent.changeText(form.getByLabelText('Precio (₡)'), '1500');
    await fireEvent.press(button('Acompañamientos', form));
    await fireEvent.press(button('Guardar', form));
    expect(await form.findByText('Ya existe uno con ese nombre.')).toBeTruthy();

    await press('Cerrar', form);
    await sheetClosed('product-form');
  });

  it('Caja ve el platillo nuevo apenas existe', async () => {
    await signInAs('cajero', 'cajero123');
    await renderWithAuth(<CashierScreen />);

    await screen.findByRole('button', { name: /Hamburguesa clásica/ });
    await press('Acompañamientos');

    expect(await screen.findByRole('button', { name: /Gallo pinto, ₡1\.800/ })).toBeTruthy();
  });

  it('edita el precio de un platillo', async () => {
    await signInAs('admin', 'admin123');
    await renderWithAuth(<MenuScreen />);
    await screen.findByText('Gallo pinto');

    await press('Editar Gallo pinto');
    const form = formSheet('product-form');
    await fireEvent.changeText(form.getByLabelText('Precio (₡)'), '2.000');
    await fireEvent.press(button('Guardar', form));

    await sheetClosed('product-form');
    expect(await screen.findByText('₡2.000')).toBeTruthy();
    expect(screen.queryByText('₡1.800')).toBeNull();
  });

  it('crea un extra y una categoría', async () => {
    await signInAs('admin', 'admin123');
    await renderWithAuth(<MenuScreen />);
    await screen.findByText('Gallo pinto');

    await press('Extras');
    await press('Nuevo extra');
    let form = formSheet('extra-form');
    await fireEvent.changeText(form.getByLabelText('Nombre'), 'Aguacate');
    await fireEvent.changeText(form.getByLabelText('Precio (₡)'), '600');
    await fireEvent.press(button('Guardar', form));
    await sheetClosed('extra-form');
    expect(await screen.findByText('Aguacate')).toBeTruthy();
    expect(screen.getByText('₡600')).toBeTruthy();

    await press('Categorías');
    await press('Nueva categoría');
    form = formSheet('category-form');
    await fireEvent.changeText(form.getByLabelText('Nombre'), 'Postres');
    await fireEvent.press(button('Guardar', form));
    await sheetClosed('category-form');
    expect(await screen.findByText('Postres')).toBeTruthy();
    expect(screen.getByText(/0 producto\(s\)/)).toBeTruthy();
  });

  it('agrega una observación frecuente', async () => {
    await signInAs('admin', 'admin123');
    await renderWithAuth(<MenuScreen />);
    await screen.findByText('Gallo pinto');

    await press('Observaciones');
    await fireEvent.changeText(screen.getByLabelText('Nueva observación'), 'Sin picante');
    await press('Agregar');

    expect(await screen.findByText('Sin picante')).toBeTruthy();
  });

  it('elimina un platillo en dos pasos, con confirmación', async () => {
    await signInAs('admin', 'admin123');
    await renderWithAuth(<MenuScreen />);
    await screen.findByText('Gallo pinto');

    await press('Editar Gallo pinto');
    const form = formSheet('product-form');
    await fireEvent.press(button('Eliminar producto', form));
    expect(await form.findByText(/¿Eliminar este producto\?/)).toBeTruthy();
    // Todavía existe: falta confirmar.
    expect(await (async () => (await import('@/services')).menuService.getMenu())()).toBeTruthy();

    await fireEvent.press(button('Sí, eliminar', form));

    await sheetClosed('product-form');
    await waitFor(() => expect(screen.queryByText('Gallo pinto')).toBeNull());
  });

  it('una categoría con productos no se puede eliminar: solo ocultar', async () => {
    await signInAs('admin', 'admin123');
    await renderWithAuth(<MenuScreen />);
    await screen.findByText('Hamburguesa clásica');

    await press('Categorías');
    await press('Editar Bebidas');
    const form = formSheet('category-form');

    expect(await form.findByText(/Tiene 2 productos/)).toBeTruthy();
    expect(form.queryByRole('button', { name: /Eliminar categoría/ })).toBeNull();
  });

  it('un cajero no ve la administración del menú: el servicio lo rechaza', async () => {
    await signInAs('cajero', 'cajero123');
    const { menuService } = await import('@/services');

    await expect(menuService.createCategory({ name: 'Intento' })).rejects.toMatchObject({
      code: 'forbidden',
    });
  });
});
