import { computeLayout } from './useResponsiveLayout';

const layout = (width, height, fontScale = 1) => computeLayout({ width, height, fontScale });

describe('diseño según el tamaño de la ventana', () => {
  it('teléfono vertical: móvil y compacto, una sola columna, sin barra lateral', () => {
    expect(layout(390, 844)).toMatchObject({ mobile: true, short: false, compact: true, sidebar: false, split: false, board: false });
  });

  it('tablet vertical: ni móvil ni compacta; todavía sin dos columnas', () => {
    expect(layout(820, 1180)).toMatchObject({ mobile: false, short: false, compact: false, sidebar: false, split: false });
  });

  it('tablet horizontal: barra lateral y dos columnas', () => {
    expect(layout(1280, 800)).toMatchObject({ mobile: false, compact: false, sidebar: true, split: true });
  });

  it('escritorio ancho: tres columnas para cocina', () => {
    expect(layout(1600, 900)).toMatchObject({ sidebar: true, split: true, board: true });
  });

  it('poca altura compacta la interfaz aunque la ventana sea ancha (teclado abierto, teléfono horizontal)', () => {
    expect(layout(1280, 554)).toMatchObject({ mobile: false, short: true, compact: true, sidebar: true });
    expect(layout(844, 390)).toMatchObject({ mobile: false, short: true, compact: true });
  });

  it('los umbrales son exactos', () => {
    expect(layout(599, 800).mobile).toBe(true);
    expect(layout(600, 800).mobile).toBe(false);
    expect(layout(1000, 639).short).toBe(true);
    expect(layout(1000, 640).short).toBe(false);
  });

  it('un texto grande activa antes las versiones compactas', () => {
    expect(layout(1280, 800, 1).short).toBe(false);
    expect(layout(1280, 800, 1.5).short).toBe(true); // 800 / 1.5 ≈ 533
    expect(layout(700, 900, 1.3).mobile).toBe(true); // 700 / 1.3 ≈ 538
  });

  it('un texto más pequeño que el normal no cambia nada', () => {
    expect(layout(1280, 800, 0.8)).toEqual({ ...layout(1280, 800, 1), fontScale: 1 });
  });

  it('el ancho del contenido descuenta la barra lateral y el margen, y tiene tope', () => {
    expect(layout(1280, 800).contentWidth).toBe(1280 - 224 - 24 * 2);
    expect(layout(390, 844).contentWidth).toBe(390 - 16 * 2);
    expect(layout(3000, 1200).contentWidth).toBeLessThanOrEqual(1680 - 24 * 2);
  });
});
