import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';

/**
 * Estilos reutilizables ("clases utilitarias"). Se combinan con un arreglo:
 *   <View style={[commonStyles.card, commonStyles.row]} />
 * Si un patrón visual aparece en dos pantallas, va aquí o en un componente de
 * shared/ui, no se copia.
 */
export const commonStyles = StyleSheet.create({
  fill: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.card,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },
});
