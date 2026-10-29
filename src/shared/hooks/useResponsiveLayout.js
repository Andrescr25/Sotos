import { useWindowDimensions } from 'react-native';
import { theme } from '@/shared/theme';

/**
 * Medidas de la ventana → decisiones de diseño. Función pura (se prueba sin
 * pantalla). Todo se calcula sobre el espacio útil dividido entre el tamaño del
 * texto, para que un texto grande también active las versiones compactas.
 *
 * - `mobile`   ancho menor a `mobileBreakpoint` (teléfono).
 * - `short`    altura menor a `shortHeight` (teléfono horizontal, ventana pequeña).
 * - `compact`  `mobile` o `short`: poco espacio vertical; las pantallas ceden
 *              altura (la cabecera se desplaza con el contenido, los modales
 *              son más densos).
 * - `sidebar`  hay espacio para la navegación lateral.
 * - `split`    caben dos columnas (catálogo + pedido, ventas + cuadre).
 * - `board`    caben tres columnas (tablero de cocina).
 *
 * @param {{ width: number, height: number, fontScale: number }} window
 */
export function computeLayout({ width, height, fontScale }) {
  const scale = Math.max(fontScale, 1);
  const sidebar = width / scale >= theme.layout.sidebarBreakpoint;
  const mobile = width / scale < theme.layout.mobileBreakpoint;
  const short = height / scale < theme.layout.shortHeight;
  const padding = mobile ? theme.spacing.lg : theme.spacing.xl;
  const contentWidth = Math.min(
    theme.layout.maxContentWidth,
    width - (sidebar ? theme.layout.sidebarWidth : 0),
  ) - padding * 2;

  return {
    width, height, fontScale: scale, sidebar, mobile, short, compact: mobile || short, padding, contentWidth,
    split: contentWidth / scale >= theme.layout.splitBreakpoint,
    board: contentWidth / scale >= theme.layout.boardBreakpoint,
  };
}

/** Un mismo cálculo para la navegación, las columnas, la densidad y el tamaño del texto. */
export function useResponsiveLayout() {
  return computeLayout(useWindowDimensions());
}
