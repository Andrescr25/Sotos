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
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.sm },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  group: { gap: theme.spacing.sm },
  section: { gap: theme.spacing.lg },
  list: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xl },
  toolbar: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
    justifyContent: 'space-between', gap: theme.spacing.md,
  },
  banner: { marginBottom: theme.spacing.md },
  iconWell: {
    width: theme.sizes.iconWell, height: theme.sizes.iconWell,
    borderRadius: theme.radius.md, backgroundColor: theme.colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  iconButton: {
    width: theme.sizes.touchTargetCompact, minHeight: theme.sizes.touchTargetCompact,
    borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  empty: {
    minHeight: theme.layout.emptyMinHeight, padding: theme.spacing.xl,
    alignItems: 'center', justifyContent: 'center', gap: theme.spacing.md,
  },
  emptyText: { textAlign: 'center' },
});
