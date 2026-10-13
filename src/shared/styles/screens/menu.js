import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';
import { commonStyles } from '@/shared/styles/commonStyles';
export const styles = StyleSheet.create({
  banner: commonStyles.banner,
  empty: { ...commonStyles.card, ...commonStyles.empty, marginBottom: theme.spacing.lg },
  emptyText: commonStyles.emptyText,
  emptyActions: { ...commonStyles.chips, justifyContent: 'center', width: '100%' },
  tabs: { ...commonStyles.chips, marginBottom: theme.spacing.sm },
  list: commonStyles.list,
  toolbar: commonStyles.toolbar,
  filters: { ...commonStyles.chips, flexShrink: 1, minWidth: 0 },
  hint: { flex: 1, minWidth: theme.layout.rowInfoBasis, fontSize: theme.fontSizes.caption },
  noteForm: { ...commonStyles.toolbar, alignItems: 'flex-end' },
  noteInput: { flexGrow: 1, flexBasis: theme.layout.rowInfoBasis, minWidth: 0 },
  notes: { gap: theme.spacing.sm },
  noteRow: { ...commonStyles.rowBetween },
  noteText: { flex: 1, minWidth: 0 },
});
