import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';

export const styles = StyleSheet.create({
  chip: {
    minHeight: theme.sizes.touchTargetCompact,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    maxWidth: '100%',
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  label: { flexShrink: 1, fontSize: theme.fontSizes.caption, fontWeight: theme.fontWeights.bold },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
  selected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
});
