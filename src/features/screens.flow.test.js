/**
 * Pruebas de interfaz: renderizan cada pantalla y simulan los toques del
 * personal, en modo memoria (sin servidor). Son un flujo continuo —igual que
 * un turno de trabajo—, así que el orden de los casos importa y comparten el
 * mismo estado de datos.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { AuthProvider } from '@/features/auth';
import AdminScreen from '@/features/admin/screens/AdminScreen';
import UsersScreen from '@/features/admin/screens/UsersScreen';
import LoginScreen from '@/features/auth/screens/LoginScreen';
import PendingAccessScreen from '@/features/auth/screens/PendingAccessScreen';
import CashClosingScreen from '@/features/cashier/screens/CashClosingScreen';
import CashierScreen from '@/features/cashier/screens/CashierScreen';
import KitchenScreen from '@/features/kitchen/screens/KitchenScreen';
import { menuSeed } from '@/data/seed/menu';
import { usersSeed } from '@/data/seed/users';
import { findProduct } from '@/domain/menu';
import { addItem, createDraftOrder, createOrderItem, setCustomerName } from '@/domain/orders';
import { PAYMENT_METHOD } from '@/domain/payments';
import { authService, orderService } from '@/services';
import { AppError } from '@/shared/errors/AppError';
import { browserPrinter } from '@/shared/printing/browserPrinter';

const mockRouter = {
  replace: jest.fn(),
  push: jest.fn(),
  back: jest.fn(),
  canGoBack: () => false,
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('@/shared/printing/browserPrinter', () => ({
  browserPrinter: { supported: true, printDocument: jest.fn(() => ({ status: 'dialog-opened' })) },
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
    expect(screen.getByRole('button', { name: /Cierre de caja/ })).toBeTruthy();
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

    // Enviar abre el cobro: el pedido todavía NO está en cocina.
    await press('Enviar pedido a cocina');
    const payment = await screen.findByTestId('payment-sheet');
    expect(within(payment).getByText('Cobrar pedido')).toBeTruthy();
    expect(within(payment).getByText('₡8.500')).toBeTruthy();
    expect(await orderService.listKitchenOrders()).toHaveLength(0);
    const confirm = () => button('Confirmar pago y enviar a cocina');

    // Sin elegir cómo paga el cliente no se puede confirmar.
    expect(confirm().props.accessibilityState.disabled).toBe(true);

    // Efectivo: pide con cuánto paga; si no alcanza avisa cuánto falta.
    await press('Efectivo');
    expect(confirm().props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(screen.getByLabelText('¿Con cuánto paga el cliente?'), '5000');
    expect(within(payment).getByText('Falta para completar el total')).toBeTruthy();
    expect(within(payment).getByText('₡3.500')).toBeTruthy();
    expect(confirm().props.accessibilityState.disabled).toBe(true);

    // Un monto sugerido calcula el vuelto.
    await press('₡10.000');
    expect(within(payment).getByText('Vuelto para el cliente')).toBeTruthy();
    expect(within(payment).getByText('₡1.500')).toBeTruthy();
    expect(confirm().props.accessibilityState.disabled).toBe(false);

    // Volver al pedido no envía nada y conserva el borrador.
    await press('Volver al pedido');
    expect(screen.queryByTestId('payment-sheet')).toBeNull();
    expect(screen.getByText('2 × Hamburguesa clásica')).toBeTruthy();
    expect(await orderService.listKitchenOrders()).toHaveLength(0);

    // Se cobra de nuevo y, al confirmar el pago, el pedido sale a cocina.
    await press('Enviar pedido a cocina');
    await press('Efectivo');
    await fireEvent.changeText(screen.getByLabelText('¿Con cuánto paga el cliente?'), '10000');
    await press('Confirmar pago y enviar a cocina');

    expect(await screen.findByRole('button', { name: 'Imprimir comprobante' })).toBeTruthy();
    // El comprobante en pantalla muestra cómo pagó y el vuelto para entregar.
    expect(screen.getByText('Pagó con')).toBeTruthy();
    expect(screen.getByText('Recibido')).toBeTruthy();
    expect(screen.getByText('₡1.500')).toBeTruthy();
    await press('Imprimir comprobante');
    expect(browserPrinter.printDocument).toHaveBeenCalledTimes(1);
    const html = browserPrinter.printDocument.mock.calls[0][0];
    expect(html).toContain('Ana Mora');
    expect(html).toContain('₡8.500');
    expect(html).toContain('Recibido');
    expect(html).toContain('Vuelto');
    expect(html).toContain('No es una factura electrónica.');
    expect(await orderService.listKitchenOrders()).toHaveLength(1);

    // Una falla al imprimir no toca el pedido ya confirmado ni obliga a reenviar.
    browserPrinter.printDocument.mockImplementationOnce(() => { throw new AppError('print_popup_blocked', 'Blocked'); });
    await press('Imprimir comprobante');
    expect(await screen.findByText(/Permite las ventanas emergentes/)).toBeTruthy();
    expect(await orderService.listKitchenOrders()).toHaveLength(1);
    await press('Seguir tomando pedidos');
    expect(screen.getByText('Agrega productos para poder enviar el pedido.')).toBeTruthy();

    // El acceso al último comprobante sigue disponible al empezar otra cuenta.
    await press('Comprobante #001');
    await press('58 mm');
    await press('Imprimir comprobante');
    expect(browserPrinter.printDocument.mock.calls.at(-1)[0]).toContain('papel de 58 mm');
    expect(await orderService.listKitchenOrders()).toHaveLength(1);
    await press('Seguir tomando pedidos');
  });

  it('cocina recibe el pedido y lo avanza hasta "listo"', async () => {
    await signInAs('cocinero', 'cocinero123');
    await renderWithAuth(<KitchenScreen />);

    expect(await screen.findByText('#001')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Ir a Cierre/ })).toBeNull(); // el cierre no es de cocina
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

    await press('Imprimir comprobante #001');
    expect(await screen.findByRole('button', { name: 'Imprimir comprobante' })).toBeTruthy();
    await press('Seguir tomando pedidos');
    await press('Listos (1)');
    await press('Marcar como entregado');

    expect(await screen.findByText('No hay pedidos listos por ahora.')).toBeTruthy();
    expect(await orderService.listKitchenOrders()).toHaveLength(0);
  });
});

describe('cobro y envío a cocina', () => {
  it('si falla el envío, el error sale dentro del cobro y el borrador se conserva para reintentar', async () => {
    await signInAs('cajero', 'cajero123');
    await renderWithAuth(<CashierScreen />);
    await screen.findByRole('button', { name: /Hamburguesa clásica/ });
    await press('Bebidas');
    await press(/Coca-Cola/);
    await fireEvent.changeText(screen.getByLabelText('Nombre del cliente *'), 'María');
    await press('Enviar pedido a cocina');
    await press('SINPE Móvil');
    const send = jest.spyOn(orderService, 'sendToKitchen').mockRejectedValueOnce(new AppError('network', 'Offline'));
    try {
      await press('Confirmar pago y enviar a cocina');

      const payment = await screen.findByTestId('payment-sheet');
      expect(await within(payment).findByText('No hay conexión con el servidor. Revisa el WiFi e intenta de nuevo.')).toBeTruthy();
      expect(screen.getByLabelText('Nombre del cliente *').props.value).toBe('María');
      expect(screen.getByText('1 × Coca-Cola')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Imprimir comprobante' })).toBeNull();
      expect(screen.queryByRole('button', { name: /^Comprobante #/ })).toBeNull();
      expect(await orderService.listKitchenOrders()).toHaveLength(0);

      // El cobro sigue abierto con SINPE elegido: confirmar de nuevo envía el pedido.
      send.mockRestore();
      await press('Confirmar pago y enviar a cocina');
      expect(await screen.findByRole('button', { name: 'Imprimir comprobante' })).toBeTruthy();
      expect(await orderService.listKitchenOrders()).toHaveLength(1);
    } finally {
      send.mockRestore();
      await authService.logout();
    }
  });
});

describe('cierre de caja', () => {
  it('el cajero ve lo cobrado por forma de pago, cuadra el efectivo y cierra la caja', async () => {
    await signInAs('cajero', 'cajero123');
    await renderWithAuth(<CashClosingScreen />);

    // Dos pedidos cobrados: ₡8.500 en efectivo (pedido de Ana) y ₡1.000 por SINPE (pedido de María).
    expect(await screen.findByText('Ventas por cerrar')).toBeTruthy();
    expect(screen.getByText('2 pedidos cobrados')).toBeTruthy();
    expect(screen.getByText('₡9.500')).toBeTruthy();
    expect(screen.getByText('1 pedido · ₡8.500')).toBeTruthy(); // efectivo
    expect(screen.getByText('1 pedido · ₡1.000')).toBeTruthy(); // SINPE Móvil
    expect(screen.getByText('0 pedidos · ₡0')).toBeTruthy(); // tarjeta

    // Hay que contar el efectivo antes de poder cerrar.
    expect(button('Cerrar caja').props.accessibilityState.disabled).toBe(true);

    // Fondo ₡0: se esperan ₡8.500. Contar menos muestra el faltante.
    await fireEvent.changeText(screen.getByLabelText(/Efectivo contado/), '8000');
    expect(await screen.findByText('Falta en caja')).toBeTruthy();
    expect(screen.getByText('₡500')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText(/Efectivo contado/), '8500');
    expect(await screen.findByText('Cuadra')).toBeTruthy();
    expect(button('Cerrar caja').props.accessibilityState.disabled).toBe(false);

    // Cerrar pide una última confirmación.
    await press('Cerrar caja');
    const sheet = await screen.findByTestId('close-register-sheet');
    expect(within(sheet).getByText('¿Cerrar la caja?')).toBeTruthy();
    await press('Confirmar cierre');

    expect(await screen.findByText(/Caja cerrada\. Cierre #1/)).toBeTruthy();
    expect(await screen.findByText('No hay ventas por cerrar')).toBeTruthy();
    expect(screen.getByText('Cierre #1')).toBeTruthy(); // aparece en el historial
    expect(screen.getByText('Efectivo contado ₡8.500 · Cuadró')).toBeTruthy();
    await authService.logout();
  });

  it('una venta nueva aparece sola en la pantalla abierta, y el fondo sugerido es lo contado antes', async () => {
    await signInAs('cajero', 'cajero123');
    await renderWithAuth(<CashClosingScreen />);
    expect(await screen.findByText('No hay ventas por cerrar')).toBeTruthy();

    // Otra tablet cobra un pedido de ₡1.000 con tarjeta mientras esta pantalla sigue abierta.
    const [cashier] = usersSeed;
    const draft = addItem(
      setCustomerName(createDraftOrder({ createdBy: cashier }), 'Luis Rojas'),
      createOrderItem({ product: findProduct(menuSeed, 'prod-coca-cola') }),
    );
    await orderService.sendToKitchen(draft, cashier, { method: PAYMENT_METHOD.CARD });

    expect(await screen.findByText('Ventas por cerrar')).toBeTruthy();
    expect(screen.getByText('1 pedido cobrado')).toBeTruthy();
    // El efectivo contado en el cierre #1 (₡8.500) queda como fondo inicial del siguiente.
    expect(screen.getByLabelText(/Fondo inicial/).props.value).toBe('8500');
    await authService.logout();
  });
});
