/**
 * Pruebas de interfaz: renderizan cada pantalla y simulan los toques del
 * personal, en modo memoria (sin servidor). Son un flujo continuo —igual que
 * un turno de trabajo—, así que el orden de los casos importa y comparten el
 * mismo estado de datos.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AuthProvider } from '@/features/auth';
import AdminScreen from '@/features/admin/screens/AdminScreen';
import UsersScreen from '@/features/admin/screens/UsersScreen';
import LoginScreen from '@/features/auth/screens/LoginScreen';
import PendingAccessScreen from '@/features/auth/screens/PendingAccessScreen';
import CashierScreen from '@/features/cashier/screens/CashierScreen';
import KitchenScreen from '@/features/kitchen/screens/KitchenScreen';
import { authService, orderService } from '@/services';

const mockRouter = {
  replace: jest.fn(),
  push: jest.fn(),
  back: jest.fn(),
  canGoBack: () => false,
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

const renderWithAuth = (screenElement) => render(<AuthProvider>{screenElement}</AuthProvider>);

// El nombre accesible de un botón incluye el glifo de su icono: se busca por
// coincidencia parcial. Un texto se convierte en expresión regular escapada.
const named = (name) =>
  typeof name === 'string' ? new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : name;
const button = (name) => screen.getByRole('button', { name: named(name) });
const press = (name) => fireEvent.press(button(name));

async function signInAs(username, password) {
  await authService.logout();
  await authService.login({ username, password });
}

describe('acceso', () => {
  it('rechaza credenciales incorrectas con un mensaje claro', async () => {
    await render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>,
    );

    await fireEvent.changeText(screen.getByLabelText('Usuario'), 'cajero');
    await fireEvent.changeText(screen.getByLabelText('Contraseña'), 'incorrecta');
    await press('Entrar');

    expect(await screen.findByText('Usuario o contraseña incorrectos.')).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('no ofrece crear cuenta: las cuentas las crea el administrador', async () => {
    await renderWithAuth(<LoginScreen />);

    expect(screen.queryByRole('button', { name: /Crear cuenta/ })).toBeNull();
    expect(screen.getByText(/Tu administrador te enviará un enlace/)).toBeTruthy();
  });

  it('no ofrece elegir un rol: solo usuario y contraseña', async () => {
    await renderWithAuth(<LoginScreen />);

    expect(screen.queryByText(/Entrar como/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /^Cajero$/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Cocinero$/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Administrador$/ })).toBeNull();
  });

  it('con credenciales correctas inicia sesión y deja que la raíz decida adónde ir', async () => {
    await renderWithAuth(<LoginScreen />);

    await fireEvent.changeText(screen.getByLabelText('Usuario'), 'cajero');
    await fireEvent.changeText(screen.getByLabelText('Contraseña'), 'cajero123');
    await press('Entrar');

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    await authService.logout();
  });

  it('una cuenta sin rol ve "acceso pendiente" y no puede trabajar', async () => {
    await signInAs('pendiente', 'pendiente123');
    await renderWithAuth(<PendingAccessScreen />);

    expect(await screen.findByText('Acceso pendiente')).toBeTruthy();
    expect(screen.getByText(/Hola Cuenta pendiente/)).toBeTruthy();
    expect(screen.getByText(/se actualiza sola/i)).toBeTruthy();
    await authService.logout();
  });
});

describe('administración', () => {
  it('el administrador ve las cuentas que esperan acceso y asigna el rol', async () => {
    await signInAs('admin', 'admin123');
    await renderWithAuth(<UsersScreen />);

    expect(await screen.findByText('Cuenta pendiente')).toBeTruthy();
    expect(screen.getByText(/1 cuenta espera que le asignes un acceso/)).toBeTruthy();

    // Las cuentas pendientes van primero; "Cocinero" del primer renglón.
    const [firstCookChip] = screen.getAllByRole('button', { name: /^Cocinero$/ });
    await fireEvent.press(firstCookChip);

    await waitFor(() => expect(screen.queryByText(/espera que le asignes un acceso/)).toBeNull());
  });

  it('el inicio de administración enlaza al menú y a los usuarios', async () => {
    await signInAs('admin', 'admin123');
    await renderWithAuth(<AdminScreen />);

    expect(await screen.findByRole('button', { name: /Menú: platillos, bebidas y extras/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Usuarios y accesos/ })).toBeTruthy();
  });
});

describe('flujo caja → cocina → entrega', () => {
  it('el cajero arma un pedido con extras y observaciones y lo envía', async () => {
    await signInAs('cajero', 'cajero123');
    await renderWithAuth(<CashierScreen />);

    // Hamburguesa con opciones: 2 unidades, 1 con queso extra, sin cebolla.
    await screen.findByRole('button', { name: /Hamburguesa clásica/ });
    await press(/Hamburguesa clásica/);
    expect(await screen.findByText('Extras')).toBeTruthy();
    const increase = screen.getAllByRole('button', { name: 'Aumentar cantidad' });
    await fireEvent.press(increase[0]); // cantidad 2
    await fireEvent.press(screen.getAllByRole('button', { name: 'Aumentar cantidad' })[1]); // queso extra ×1
    await press('Sin cebolla');
    await press(/Agregar al pedido/);

    // Bebida sin extras: se agrega con un solo toque.
    await press('Bebidas');
    await press(/Coca-Cola/);

    expect(await screen.findByText('2 × Hamburguesa clásica')).toBeTruthy();
    expect(screen.getByText(/\+ 1 × Queso extra/)).toBeTruthy();
    expect(screen.getByText('• Sin cebolla')).toBeTruthy();
    expect(screen.getByText('1 × Coca-Cola')).toBeTruthy();
    // 2 × 3.500 + 1 × 500 + 1 × 1.000
    expect(screen.getByText('₡8.500')).toBeTruthy();

    // Sin nombre del cliente no se puede enviar.
    expect(screen.getByText('Escribe el nombre del cliente para poder enviar el pedido.')).toBeTruthy();
    expect(button('Enviar pedido a cocina').props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(screen.getByLabelText('Nombre del cliente *'), '  Ana   Mora ');
    expect(button('Enviar pedido a cocina').props.accessibilityState.disabled).toBe(false);

    await press('Enviar pedido a cocina');

    expect(await screen.findByText('Pedido #001 de Ana Mora enviado a cocina.')).toBeTruthy();
    expect(screen.getByText('Agrega productos para poder enviar el pedido.')).toBeTruthy();
    expect(await orderService.listKitchenOrders()).toHaveLength(1);
  });

  it('cocina recibe el pedido y lo avanza hasta "listo"', async () => {
    await signInAs('cocinero', 'cocinero123');
    await renderWithAuth(<KitchenScreen />);

    expect(await screen.findByText('#001')).toBeTruthy();
    expect(screen.getByText('Ana Mora')).toBeTruthy(); // nombre del cliente en la tarjeta
    expect(screen.getByText('2 × Hamburguesa clásica')).toBeTruthy();
    expect(screen.getByText('+ 1 × Queso extra')).toBeTruthy();
    expect(screen.getByText('• Sin cebolla')).toBeTruthy();

    await press('Empezar preparación');
    expect(await screen.findByRole('button', { name: /Marcar como listo/ })).toBeTruthy();

    await press('Marcar como listo');
    expect(await screen.findByText('Esperando que caja los entregue')).toBeTruthy();
  });

  it('caja ve el pedido listo y lo marca como entregado', async () => {
    await signInAs('cajero', 'cajero123');
    await renderWithAuth(<CashierScreen />);

    await waitFor(() => expect(button('Listos (1)')).toBeTruthy());
    await press('Listos (1)');
    expect(await screen.findByText('Listos para entregar')).toBeTruthy();
    expect(screen.getByText('Ana Mora')).toBeTruthy();

    await press('Marcar como entregado');

    expect(await screen.findByText('No hay pedidos listos por ahora.')).toBeTruthy();
    expect(await orderService.listKitchenOrders()).toHaveLength(0);
  });
});
