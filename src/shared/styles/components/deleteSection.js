import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';

export const styles = StyleSheet.create({
  confirm: { gap: theme.spacing.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  action: { flexGrow: 1, flexShrink: 1, flexBasis: theme.layout.formActionBasis, minWidth: 0 },
});
