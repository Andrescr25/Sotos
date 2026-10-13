import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';
import { commonStyles } from '@/shared/styles/commonStyles';
export const styles = StyleSheet.create({
  banner: commonStyles.banner,
  body: { flex: 1, flexDirection: 'row', gap: theme.spacing.xl, minHeight: 0 },
  bodyNarrow: { gap: theme.spacing.xl, paddingBottom: theme.spacing.xl },
  catalog: { flex: 1, minWidth: 0, gap: theme.spacing.lg },
  catalogNarrow: { gap: theme.spacing.lg },
  catalogHeader: commonStyles.rowBetween,
  categories: { flexGrow: 0 },
  categoriesContent: { gap: theme.spacing.sm, paddingBottom: theme.spacing.xs },
  emptyMenu: { ...commonStyles.card, ...commonStyles.empty, alignSelf: 'center', width: '100%' },
  emptyMenuText: commonStyles.emptyText,
  summaryWide: { width: theme.layout.summaryWidth, minHeight: 0 },
  summaryNarrow: { width: '100%' },
});
