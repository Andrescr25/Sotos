import { StyleSheet } from 'react-native';
import { commonStyles } from '@/shared/styles/commonStyles';
import { theme } from '@/shared/theme';

const { spacing, layout, fontSizes, fontWeights, colors } = theme;

/** Lo propio de los formularios del inventario; las filas son `ListRow` y los grupos salen de `commonStyles`. */
export const styles = StyleSheet.create({
  stockValue: { fontSize: fontSizes.bodyLarge, fontWeight: fontWeights.bold, textAlign: 'right' },
  title: { fontWeight: fontWeights.bold },
  pair: { flexDirection: 'row', gap: spacing.md },
  pairField: { flex: 1, minWidth: 0 },
  preview: { ...commonStyles.panel, gap: spacing.xs, backgroundColor: colors.surfaceMuted },
  recipeLine: { ...commonStyles.rowBetween, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  recipeInfo: { flexGrow: 1, flexShrink: 1, flexBasis: layout.optionInfoBasis, minWidth: 0, gap: spacing.xs },
});
