import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';

export const styles = StyleSheet.create({
  base: {
    minHeight: theme.sizes.touchTarget,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    maxWidth: '100%',
    minWidth: 0,
    flexShrink: 1,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  compact: { minHeight: theme.sizes.touchTargetCompact, paddingHorizontal: theme.spacing.lg },
  label: { flexShrink: 1, textAlign: 'center', fontWeight: theme.fontWeights.bold },
  disabled: { opacity: 0.4 },
});
