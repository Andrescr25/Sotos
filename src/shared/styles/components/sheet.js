import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';
export const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: theme.colors.overlay, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl },
  overlayMobile: { padding: theme.spacing.sm },
  avoid: { width: '100%', maxWidth: theme.layout.sheetMaxWidth, maxHeight: '94%' },
  sheet: { width: '100%', maxHeight: '100%', backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md, padding: theme.spacing.lg, borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.background },
  title: { flex: 1, minWidth: 0 },
  body: { padding: theme.spacing.lg, gap: theme.spacing.lg },
  footer: { padding: theme.spacing.lg, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.background },
  scroll: { flexShrink: 1 },
});
