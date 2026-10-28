import { StyleSheet } from 'react-native';
import { commonStyles } from '@/shared/styles/commonStyles';
import { theme } from '@/shared/theme';

const { spacing, layout, fontSizes, fontWeights, colors } = theme;

export const styles = StyleSheet.create({
  // Fila de un insumo o de una receta
  row: { ...commonStyles.card, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.lg, padding: spacing.lg },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexGrow: 1, flexShrink: 1, flexBasis: layout.rowInfoBasis, minWidth: 0 },
  info: { flex: 1, minWidth: 0, gap: spacing.xs },
  title: { fontWeight: fontWeights.bold },
  stock: { alignItems: 'flex-end', gap: spacing.xs, flexShrink: 1, minWidth: 0 },
  stockValue: { fontSize: fontSizes.bodyLarge, fontWeight: fontWeights.bold, textAlign: 'right' },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, maxWidth: '100%' },

  // Formularios
  group: commonStyles.group,
  chips: commonStyles.chips,
  pair: { flexDirection: 'row', gap: spacing.md },
  pairField: { flex: 1, minWidth: 0 },
  preview: { ...commonStyles.card, gap: spacing.xs, backgroundColor: colors.surfaceMuted },

  // Receta: un insumo por línea con su selector de porciones
  recipeLine: { ...commonStyles.rowBetween, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  recipeInfo: { flexGrow: 1, flexShrink: 1, flexBasis: layout.optionInfoBasis, minWidth: 0, gap: spacing.xs },
});
