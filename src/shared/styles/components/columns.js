import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';

const { spacing } = theme;

export const styles = StyleSheet.create({
  wide: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xl },
  /** Columnas que ocupan toda la altura disponible (cada una se desplaza por dentro). */
  wideFill: { flex: 1, alignItems: 'stretch', minHeight: 0 },
  stacked: { gap: spacing.xl },
  /** Reparte el espacio sobrante entre las columnas sin ancho propio. */
  column: { flex: 1, minWidth: 0, gap: spacing.lg },
  /** Ancho fijo: sin `flex`, porque `flex-basis` pisaría a `width`. */
  columnFixed: { flexGrow: 0, flexShrink: 0, minWidth: 0, gap: spacing.lg },
  columnFill: { minHeight: 0 },
  /** Apiladas, cada columna ocupa el ancho completo y su alto es el de su contenido. */
  stackedColumn: { gap: spacing.lg },
});
