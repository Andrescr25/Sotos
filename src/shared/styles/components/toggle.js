import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: theme.sizes.touchTargetCompact, maxWidth: '100%' },
  label: { flexShrink: 1, fontSize: theme.fontSizes.caption },
});
