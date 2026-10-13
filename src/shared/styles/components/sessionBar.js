import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';

export const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flexShrink: 1, minWidth: 0 },
  avatar: {
    width: theme.sizes.avatar, height: theme.sizes.avatar, borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft, justifyContent: 'center', alignItems: 'center',
  },
  initials: { fontWeight: theme.fontWeights.bold },
  identity: { flexShrink: 1, minWidth: 0, gap: theme.spacing.xs },
  name: { fontWeight: theme.fontWeights.bold },
  pressed: { backgroundColor: theme.colors.border },
});
