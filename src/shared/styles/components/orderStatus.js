import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';

export const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
  },
});
