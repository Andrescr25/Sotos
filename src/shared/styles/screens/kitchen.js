import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';
import { commonStyles } from '@/shared/styles/commonStyles';
export const styles = StyleSheet.create({
  banner: commonStyles.banner,
  board: { flex: 1, flexDirection: 'row', gap: theme.spacing.lg, minHeight: 0 },
  columnScroll: { flex: 1, minWidth: 0 },
  columnContent: { gap: theme.spacing.xl, paddingBottom: theme.spacing.xl },
  column: { gap: theme.spacing.lg, padding: theme.spacing.lg, borderRadius: theme.radius.lg, backgroundColor: theme.colors.surfaceMuted },
  columnWide: { minHeight: theme.layout.emptyMinHeight },
  columnHeader: { ...commonStyles.rowBetween },
  columnTitle: { flexShrink: 1, fontSize: theme.fontSizes.bodyLarge, fontWeight: theme.fontWeights.bold },
  count: { minWidth: theme.sizes.avatar, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.pill, alignItems: 'center' },
  empty: commonStyles.empty,
});
