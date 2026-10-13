import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';

export const styles = StyleSheet.create({
  list: { gap: theme.spacing.md },
  item: { gap: theme.spacing.xs },
  detail: { marginLeft: theme.spacing.lg },
  note: { fontWeight: theme.fontWeights.bold },
});
