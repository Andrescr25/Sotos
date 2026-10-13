import { useWindowDimensions } from 'react-native';
import { theme } from '@/shared/theme';

/** Un mismo cálculo para la navegación, las columnas y el tamaño del texto. */
export function useResponsiveLayout() {
  const { width, height, fontScale } = useWindowDimensions();
  const scale = Math.max(fontScale, 1);
  const sidebar = width / scale >= theme.layout.sidebarBreakpoint;
  const mobile = width / scale < theme.layout.mobileBreakpoint;
  const padding = mobile ? theme.spacing.lg : theme.spacing.xl;
  const contentWidth = Math.min(
    theme.layout.maxContentWidth,
    width - (sidebar ? theme.layout.sidebarWidth : 0),
  ) - padding * 2;

  return {
    width, height, fontScale: scale, sidebar, mobile, padding, contentWidth,
    split: contentWidth / scale >= theme.layout.splitBreakpoint,
    board: contentWidth / scale >= theme.layout.boardBreakpoint,
  };
}
