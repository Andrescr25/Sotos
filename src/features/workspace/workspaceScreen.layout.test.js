/**
 * Marco de las pantallas internas: dónde queda la cabecera según el tamaño.
 * Con poco espacio vertical (teléfono, poca altura) y una página que se
 * desplaza, la cabecera viaja DENTRO del desplazamiento; si no, queda fija.
 */
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider } from '@/features/auth';
import { computeLayout, useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';
import { WorkspaceScreen } from './components/WorkspaceScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));
jest.mock('@/shared/hooks/useResponsiveLayout', () => ({
  ...jest.requireActual('@/shared/hooks/useResponsiveLayout'),
  useResponsiveLayout: jest.fn(),
}));

const TABLET = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };
const SHORT_WIDE = { width: 1280, height: 554 };

const setWindow = ({ width, height }) =>
  useResponsiveLayout.mockReturnValue(computeLayout({ width, height, fontScale: 1 }));

const find = (node, test) => {
  if (!node || typeof node === 'string') return null;
  if (test(node)) return node;
  for (const child of node.children ?? []) {
    const found = find(child, test);
    if (found) return found;
  }
  return null;
};
const textOf = (node) => (typeof node === 'string' ? node : (node.children ?? []).map(textOf).join('|'));
const scroller = () => find(screen.toJSON(), (node) => node.type === 'RCTScrollView');

async function renderPage(props) {
  await render(
    <AuthProvider>
      <WorkspaceScreen section="menu" title="Mi página" subtitle="Una explicación" back {...props}>
        <Text>Contenido</Text>
      </WorkspaceScreen>
    </AuthProvider>,
  );
}

describe('cabecera de página', () => {
  it('en teléfono, con página que se desplaza, la cabecera viaja con el contenido', async () => {
    setWindow(PHONE);
    await renderPage({ scroll: true });

    const text = textOf(scroller());
    expect(text).toContain('Mi página');
    expect(text).toContain('Contenido');
  });

  it('con poca altura (ventana ancha pero baja) también viaja con el contenido', async () => {
    setWindow(SHORT_WIDE);
    await renderPage({ scroll: true });

    expect(textOf(scroller())).toContain('Mi página');
  });

  it('con espacio de sobra queda fija: solo el contenido se desplaza', async () => {
    setWindow(TABLET);
    await renderPage({ scroll: true });

    const text = textOf(scroller());
    expect(text).toContain('Contenido');
    expect(text).not.toContain('Mi página');
    expect(screen.getByText('Mi página')).toBeTruthy();
  });

  it('si la página no se desplaza (paneles con desplazamiento propio) la cabecera queda fija aunque sea compacta', async () => {
    setWindow(PHONE);
    await renderPage({ scroll: false });

    expect(scroller()).toBeNull();
    expect(screen.getByText('Mi página')).toBeTruthy();
    expect(screen.getByText('Contenido')).toBeTruthy();
  });

  it('el título y "Volver" siguen disponibles en todos los tamaños', async () => {
    for (const size of [PHONE, SHORT_WIDE, TABLET]) {
      setWindow(size);
      await renderPage({ scroll: true });
      expect(screen.getByText('Mi página')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Volver' })).toBeTruthy();
      await screen.unmount();
    }
  });
});
