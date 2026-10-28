import { StyleSheet } from 'react-native';
import { commonStyles } from '@/shared/styles/commonStyles';
import { theme } from '@/shared/theme';

export const styles = StyleSheet.create({
  banner: commonStyles.banner,
  empty: { ...commonStyles.card, ...commonStyles.empty, marginBottom: theme.spacing.lg },
  emptyText: commonStyles.emptyText,
  tabs: { ...commonStyles.chips, marginBottom: theme.spacing.sm },
  list: commonStyles.list,
  toolbar: commonStyles.toolbar,
  hint: { flex: 1, minWidth: theme.layout.rowInfoBasis, fontSize: theme.fontSizes.caption },
  sectionTitle: { marginTop: theme.spacing.sm },
});
