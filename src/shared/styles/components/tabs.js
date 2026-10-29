import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';

export const styles = StyleSheet.create({
  tabs: { marginBottom: theme.spacing.sm },
  hint: { flex: 1, minWidth: theme.layout.rowInfoBasis, fontSize: theme.fontSizes.caption },
});
