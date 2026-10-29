import { StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';
const { colors, spacing, radius, sizes, layout, fontSizes, fontWeights } = theme;

export const workspaceStyles = StyleSheet.create({
  screen: { padding: 0 },
  frame: { flex: 1, flexDirection: 'row', minHeight: 0 },
  sidebar: {
    width: layout.sidebarWidth, padding: spacing.xl, gap: spacing.xxl,
    backgroundColor: colors.brandRed,
  },
  sidebarLogo: { width: layout.sidebarWidth - spacing.xl * 2, height: (layout.sidebarWidth - spacing.xl * 2) / theme.auth.wordmarkAspectRatio },
  sidebarCaption: { fontSize: fontSizes.caption, letterSpacing: theme.auth.tracking },
  sidebarLinks: { gap: spacing.sm },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    minHeight: sizes.touchTargetCompact, paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm, borderRadius: radius.md,
  },
  navSelected: { backgroundColor: colors.brandCream },
  navPressed: { backgroundColor: colors.brandOnRedSoft },
  navLabel: { flexShrink: 1, fontSize: fontSizes.body, fontWeight: fontWeights.medium },
  sidebarFooter: {
    marginTop: 'auto', borderTopWidth: 1, borderTopColor: colors.brandOnRedBorder,
    paddingTop: spacing.xl, gap: spacing.md,
  },
  sidebarMotto: { fontSize: fontSizes.title, fontWeight: fontWeights.bold },
  workspace: { flex: 1, minWidth: 0 },
  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface,
  },
  topbarMobile: { paddingHorizontal: spacing.lg },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexShrink: 1 },
  topLogo: { width: sizes.touchTargetCompact, height: sizes.touchTargetCompact },
  brandTitle: { fontSize: fontSizes.body, fontWeight: fontWeights.bold },
  mobileNav: { flexGrow: 0, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  mobileNavContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm },
  mobileNavItem: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  mobileNavSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  content: { flex: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', minHeight: 0 },
  pageHeader: { marginBottom: spacing.xl },
  pageHeaderCompact: { marginBottom: spacing.md },
  pageHeaderRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  headingCopy: { flexGrow: 1, flexShrink: 1, flexBasis: layout.rowInfoBasis / 2, gap: spacing.xs, minWidth: 0 },
  title: { fontWeight: '800', letterSpacing: -1 },
  titleMobile: { fontSize: layout.mobileTitle },
  subtitle: { fontSize: fontSizes.caption },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, maxWidth: '100%' },
  back: { marginBottom: spacing.md, alignSelf: 'flex-start' },
  body: { flex: 1, minHeight: 0 },
  /** Contenido que llena la altura (sin desplazamiento de página): sus hijos se separan igual que en `scrollContent`. */
  bodyFill: { gap: spacing.lg },
  scrollContent: { flexGrow: 1, paddingBottom: spacing.xl, gap: spacing.lg },
});
