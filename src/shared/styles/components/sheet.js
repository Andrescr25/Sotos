import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';

const { colors, spacing, radius, layout } = theme;

export const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  overlayCompact: { padding: spacing.sm },
  avoid: { width: '100%', maxWidth: layout.sheetMaxWidth, maxHeight: '94%' },
  sheet: { width: '100%', maxHeight: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background },
  headerCompact: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  title: { flex: 1, minWidth: 0 },
  body: { padding: spacing.lg, gap: spacing.lg },
  bodyCompact: { padding: spacing.md, gap: spacing.md },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
  footerCompact: { padding: spacing.md },
  scroll: { flexShrink: 1 },
});
