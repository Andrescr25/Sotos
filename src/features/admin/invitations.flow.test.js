/**
 * Flujo de invitación por pantallas, en modo memoria: el administrador crea
 * la cuenta de un empleado, copia el enlace, y el empleado lo abre y crea su
 * contraseña. Es un flujo continuo: el orden de los casos importa.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import UsersScreen from '@/features/admin/screens/UsersScreen';
import { AuthProvider } from '@/features/auth';
import InvitationScreen from '@/features/auth/screens/InvitationScreen';
import { authService } from '@/services';

const mockRouter = { replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => true };
const mockParams = { token: 'inventado' };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

jest.mock('expo-linking', () => ({
  createURL: (path) => `https://sotos.test${path}`,
  openURL: jest.fn(async () => true),
}));

const mockCopy = jest.fn(async () => true);
jest.mock('expo-clipboard', () => ({ setStringAsync: (...args) => mockCopy(...args) }));

const named = (name) =>
  typeof name === 'string' ? new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : name;
const button = (name, scope = screen) => scope.getByRole('button', { name: named(name) });
const press = (name, scope = screen) => fireEvent.press(button(name, scope));
const renderWithAuth = (element) => render(<AuthProvider>{element}</AuthProvider>);

let issuedToken;

describe('invitar a un empleado', () => {
  it('el admin crea la cuenta y recibe un enlace para copiar', async () => {
    await authService.login({ username: 'admin', password: 'admin123' });
    await renderWithAuth(<UsersScreen />);
    await screen.findByText('Cajero demo');

    await press('Invitar empleado');
    const form = within(screen.getByTestId('invite-form'));

    // Al escribir el nombre se sugiere el usuario.
    await fireEvent.changeText(form.getByLabelText('Nombre del empleado'), 'Pedro Mora');
    expect(form.getByDisplayValue('pedro.mora')).toBeTruthy();

    await fireEvent.press(button('Cocinero', form));
    await fireEvent.press(button('Crear cuenta y generar enlace', form));

    const sheet = within(await screen.findByTestId('invite-link'));
    expect(sheet.getByText('Enlace para Pedro Mora')).toBeTruthy();
    expect(sheet.getByText(/con acceso de Cocinero/)).toBeTruthy();

    const url = sheet.getByLabelText('Enlace').props.value;
    expect(url).toMatch(/\/invitacion\/[^/?#\s]+/);
    issuedToken = decodeURIComponent(url.match(/\/invitacion\/([^/?#\s]+)/)[1]);

    await fireEvent.press(button('Copiar enlace', sheet));
    expect(mockCopy).toHaveBeenCalledWith(url);
    expect(await sheet.findByText('¡Copiado!')).toBeTruthy();
  });

  it('en la lista aparece como invitación pendiente, con opción de generar un enlace nuevo', async () => {
    await authService.login({ username: 'admin', password: 'admin123' });
    await renderWithAuth(<UsersScreen />);

    expect(await screen.findByText('Pedro Mora')).toBeTruthy();
    expect(screen.getByText(/Invitación enviada: todavía no crea su contraseña/)).toBeTruthy();
    expect(button('Nuevo enlace de Pedro Mora')).toBeTruthy();
  });

  it('valida el formulario y no repite usuarios', async () => {
    await authService.login({ username: 'admin', password: 'admin123' });
    await renderWithAuth(<UsersScreen />);
    await screen.findByText('Pedro Mora');

    await press('Invitar empleado');
    const form = within(screen.getByTestId('invite-form'));
    await fireEvent.press(button('Crear cuenta y generar enlace', form));
    expect(await form.findByText('Escribe el nombre del empleado.')).toBeTruthy();

    await fireEvent.changeText(form.getByLabelText('Nombre del empleado'), 'Otro Pedro');
    await fireEvent.changeText(form.getByLabelText(/^Usuario/), 'pedro.mora');
    await fireEvent.press(button('Crear cuenta y generar enlace', form));
    expect(await form.findByText('Ese usuario ya existe. Elige otro.')).toBeTruthy();
  });
});

describe('el empleado abre el enlace', () => {
  beforeEach(async () => {
    mockRouter.replace.mockClear();
    await authService.logout();
  });

  it('un enlace que no existe muestra un mensaje claro', async () => {
    mockParams.token = 'inventado';
    await renderWithAuth(<InvitationScreen />);

    expect(await screen.findByText('Enlace no válido')).toBeTruthy();
    expect(screen.getByText(/no es válido/)).toBeTruthy();
    await press('Ir al inicio de sesión');
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  it('ve su nombre y su acceso, y debe repetir bien la contraseña', async () => {
    mockParams.token = issuedToken;
    await renderWithAuth(<InvitationScreen />);

    expect(await screen.findByText('Bienvenido, Pedro Mora')).toBeTruthy();
    expect(screen.getByText(/tu acceso es de Cocinero/)).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText(/^Contraseña/), 'clave-segura');
    await fireEvent.changeText(screen.getByLabelText('Repite la contraseña'), 'otra-cosa');
    await press('Guardar contraseña y entrar');
    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('una contraseña corta se rechaza y el enlace sigue sirviendo', async () => {
    mockParams.token = issuedToken;
    await renderWithAuth(<InvitationScreen />);
    await screen.findByText('Bienvenido, Pedro Mora');

    await fireEvent.changeText(screen.getByLabelText(/^Contraseña/), '123');
    await fireEvent.changeText(screen.getByLabelText('Repite la contraseña'), '123');
    await press('Guardar contraseña y entrar');

    expect(await screen.findByText('La contraseña debe tener al menos 6 caracteres.')).toBeTruthy();
    expect(screen.queryByText('Enlace no válido')).toBeNull();
  });

  it('crea su contraseña, queda con la sesión abierta y con su rol', async () => {
    mockParams.token = issuedToken;
    await renderWithAuth(<InvitationScreen />);
    await screen.findByText('Bienvenido, Pedro Mora');

    await fireEvent.changeText(screen.getByLabelText(/^Contraseña/), 'clave-segura');
    await fireEvent.changeText(screen.getByLabelText('Repite la contraseña'), 'clave-segura');
    await press('Guardar contraseña y entrar');

    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/'));
    const restored = await authService.restore();
    expect(restored).toMatchObject({ username: 'pedro.mora', role: 'cook', passwordSet: true });
  });

  it('el mismo enlace ya no sirve', async () => {
    mockParams.token = issuedToken;
    await renderWithAuth(<InvitationScreen />);

    expect(await screen.findByText('Enlace no válido')).toBeTruthy();
    expect(screen.getByText(/ya se usó/)).toBeTruthy();
  });

  it('puede volver a entrar con su usuario y contraseña', async () => {
    await expect(
      authService.login({ username: 'pedro.mora', password: 'clave-segura' }),
    ).resolves.toMatchObject({ role: 'cook' });
  });
});

describe('restablecer contraseña', () => {
  it('el admin genera un enlace para quien ya tiene contraseña', async () => {
    await authService.login({ username: 'admin', password: 'admin123' });
    await renderWithAuth(<UsersScreen />);
    await screen.findByText('Pedro Mora');

    // Ya creó su contraseña: ya no es una invitación pendiente.
    expect(screen.queryByText(/Invitación enviada/)).toBeNull();
    await press('Restablecer contraseña de Pedro Mora');

    const sheet = within(await screen.findByTestId('invite-link'));
    expect(sheet.getByText('Contraseña nueva para Pedro Mora')).toBeTruthy();
    expect(sheet.getByText(/la anterior dejará de servir/)).toBeTruthy();
  });
});
