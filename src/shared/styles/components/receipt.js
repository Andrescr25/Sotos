import { StyleSheet } from 'react-native';
import { commonStyles } from '@/shared/styles/commonStyles';
import { theme } from '@/shared/theme';

export const styles = StyleSheet.create({
  confirmation: { ...commonStyles.card, backgroundColor: theme.colors.successSoft, gap: theme.spacing.md },
  total: { ...commonStyles.rowBetween, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.md },
});
