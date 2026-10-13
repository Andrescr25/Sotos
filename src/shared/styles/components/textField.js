import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';
export const styles = StyleSheet.create({
  wrapper: { gap: theme.spacing.sm, minWidth: 0, maxWidth: '100%' },
  label: { fontSize: theme.fontSizes.caption, fontWeight: theme.fontWeights.bold },
  input: {
    minHeight: theme.sizes.touchTarget, minWidth: 0, maxWidth: '100%',
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
    backgroundColor: theme.colors.background, color: theme.colors.textPrimary, fontSize: theme.fontSizes.body,
  },
  focused: { borderColor: theme.colors.primary, backgroundColor: theme.colors.surface },
  multiline: { minHeight: theme.sizes.touchTarget * 1.6, textAlignVertical: 'top' },
  inputError: { borderColor: theme.colors.danger },
});
