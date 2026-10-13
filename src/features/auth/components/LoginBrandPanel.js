import { StyleSheet, View } from 'react-native';
import { theme } from '@/shared/theme';
import { Icon, Text } from '@/shared/ui';
import { BrandLogo } from '@/shared/ui/BrandLogo';

const STEPS = ['Recibe', 'Prepara', 'Entrega'];

export function LoginBrandPanel({ wide, large, compact }) {
  return (
    <View style={[
      styles.panel,
      wide ? styles.panelWide : styles.panelMobile,
      wide && large && styles.panelLarge,
      !wide && compact && styles.panelCompact,
    ]}>
      <View style={styles.top}>
        <BrandLogo compact={!wide} />
        <View style={styles.teamBadge}>
          <View style={styles.dot} />
          <Text color="brandCream" style={styles.badgeText}>{wide ? 'ESPACIO DEL EQUIPO' : 'EL EQUIPO'}</Text>
        </View>
      </View>

      <View style={[styles.intro, !wide && styles.introMobile]}>
        <Text
          accessibilityRole="header"
          color="brandCream"
          style={[styles.headline, !large && styles.headlineTablet, !wide && styles.headlineMobile]}
        >
          {wide ? 'Cada pedido,\nun gran servicio.' : 'Cada pedido, un gran servicio.'}
        </Text>
        <Text color="brandOnRedMuted" style={styles.description}>
          {wide
            ? 'Todo listo para trabajar juntos. De la primera orden a la última entrega.'
            : 'Todo listo para trabajar juntos.'}
        </Text>
      </View>

      {wide ? <ServiceIllustration /> : null}

      <View style={[styles.bottom, !wide && styles.bottomMobile]}>
        <View style={styles.steps}>
          {STEPS.map((step, index) => (
            <View key={step} style={styles.step}>
              <Text color="brandOnRedMuted" style={styles.stepNumber}>0{index + 1}</Text>
              <Text color="brandCream" style={styles.stepText}>{step}</Text>
              {index < STEPS.length - 1 ? <Icon name="arrow-forward" size="sm" color="brandOnRedMuted" /> : null}
            </View>
          ))}
        </View>
        {wide ? (
          <Text color="brandOnRedMuted" style={styles.signature}>
            El buen servicio empieza con un buen equipo.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function ServiceIllustration() {
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.illustration}
    >
      <View style={styles.orbit} />
      <View style={styles.orbitInner} />
      <View style={styles.ticket}>
        <View style={styles.ticketHeading}>
          <Icon name="receipt-outline" color="brandRed" />
          <Text color="brandRed" style={styles.ticketLabel}>LA RECETA</Text>
        </View>
        <View style={styles.ticketDivider} />
        <Text color="brandInk" style={styles.ticketTitle}>Un gran equipo.</Text>
        <View style={styles.ticketRow}>
          <Text color="brandMuted" style={styles.ticketBody}>Una buena actitud</Text>
          <Icon name="checkmark" size="sm" color="brandRed" />
        </View>
        <View style={styles.ticketRow}>
          <Text color="brandMuted" style={styles.ticketBody}>Todo en su punto</Text>
          <Icon name="checkmark" size="sm" color="brandRed" />
        </View>
        <View style={styles.ticketDivider} />
        <Text color="brandRed" style={styles.ticketFoot}>HECHO EN EQUIPO</Text>
      </View>
      <View style={styles.seal}>
        <Icon name="restaurant-outline" color="brandCream" />
        <Text color="brandCream" style={styles.sealText}>{'CON TODO\nEL SABOR'}</Text>
      </View>
    </View>
  );
}

const { auth, colors, spacing, radius, fontWeights } = theme;

const styles = StyleSheet.create({
  panel: { backgroundColor: colors.brandRed, borderRadius: auth.panelRadius, overflow: 'hidden' },
  panelWide: {
    flex: auth.heroFlex, minWidth: 0, padding: auth.panelPadding, justifyContent: 'space-between',
  },
  panelLarge: { padding: auth.panelPaddingLarge },
  panelMobile: { padding: auth.mobilePanelPadding, gap: auth.mobileIntroGap },
  panelCompact: { padding: auth.mobilePanelPaddingCompact },
  top: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.lg },
  teamBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1, borderColor: colors.brandOnRedBorder, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  dot: { width: spacing.sm, height: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.brandCream },
  badgeText: { fontSize: auth.eyebrow, fontWeight: fontWeights.medium, letterSpacing: 1 },
  intro: { marginTop: auth.introGap, gap: spacing.xl },
  introMobile: { marginTop: 0, gap: spacing.md },
  headline: {
    fontSize: auth.heroHeading, lineHeight: auth.heroHeadingLine,
    fontWeight: '800', letterSpacing: auth.headingTracking,
  },
  headlineTablet: { fontSize: auth.heroHeadingTablet, lineHeight: auth.heroHeadingTabletLine },
  headlineMobile: { fontSize: auth.heroHeadingMobile, lineHeight: auth.heroHeadingMobileLine, letterSpacing: -1 },
  description: { fontSize: auth.body, lineHeight: auth.bodyLine, maxWidth: auth.formMaxWidth },
  bottom: { borderTopWidth: 1, borderTopColor: colors.brandOnRedBorder, paddingTop: spacing.xl, gap: spacing.xl },
  bottomMobile: { paddingTop: spacing.lg },
  steps: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.lg },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepNumber: { fontSize: auth.eyebrow },
  stepText: { fontSize: auth.caption, fontWeight: fontWeights.medium },
  signature: { fontSize: auth.caption },
  illustration: { height: auth.illustrationHeight, marginVertical: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  orbit: {
    position: 'absolute', width: auth.orbitSize, height: auth.orbitSize,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.brandOnRedBorder, right: auth.orbitOffset,
  },
  orbitInner: {
    position: 'absolute', width: auth.orbitSize - auth.orbitOffset * 2,
    height: auth.orbitSize - auth.orbitOffset * 2, borderRadius: radius.pill,
    backgroundColor: colors.brandOnRedSoft, right: auth.orbitOffset * 2,
  },
  ticket: {
    width: auth.ticketWidth, padding: auth.ticketPadding, backgroundColor: colors.brandCream,
    borderRadius: radius.md, gap: spacing.md, transform: [{ rotate: '-8deg' }], marginRight: auth.ticketOffset,
  },
  ticketHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ticketLabel: { fontSize: auth.eyebrow, fontWeight: fontWeights.bold, letterSpacing: auth.tracking },
  ticketDivider: { borderTopWidth: 1, borderStyle: 'dashed', borderColor: colors.brandBorder },
  ticketTitle: { fontSize: auth.body, fontWeight: fontWeights.bold },
  ticketRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  ticketBody: { fontSize: auth.caption },
  ticketFoot: { fontSize: auth.eyebrow, fontWeight: fontWeights.bold, letterSpacing: 1, textAlign: 'center' },
  seal: {
    position: 'absolute', right: auth.orbitOffset, bottom: auth.orbitOffset,
    width: auth.sealSize, height: auth.sealSize, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.brandOnRedBorder, backgroundColor: colors.brandRedPressed,
    alignItems: 'center', justifyContent: 'center', gap: spacing.xs, transform: [{ rotate: '12deg' }],
  },
  sealText: { fontSize: auth.eyebrow, fontWeight: fontWeights.bold, textAlign: 'center', letterSpacing: 1 },
});
