import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';
const { colors, spacing, radius, fontWeights, layout } = theme;
export const styles = StyleSheet.create({
  hero: { backgroundColor: colors.surfaceMuted, padding: spacing.xxl, borderRadius: radius.lg, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xl },
  heroMobile: { padding: spacing.xl },
  heroCopy: { flex: 1, minWidth: 0, gap: spacing.md },
  eyebrow: { fontSize: theme.auth.eyebrow, letterSpacing: theme.auth.tracking, fontWeight: fontWeights.bold },
  heroTitle: { fontSize: layout.pageHeroTitle, fontWeight: '800', letterSpacing: -1 },
  heroTitleMobile: { fontSize: layout.mobileTitle },
  heroDescription: { maxWidth: theme.auth.formMaxWidth },
  heroLogo: { width: theme.auth.sealSize, height: theme.auth.sealSize, borderRadius: radius.lg },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  section: { gap: spacing.lg, marginTop: spacing.sm },
  sectionTitle: { fontWeight: fontWeights.bold },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
});
