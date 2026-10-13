import { Image, StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';

/** Originales de la marca, incluidos en el bundle y disponibles sin conexión. */
export function BrandLogo({ profile = false, compact = false, style, decorative = false }) {
  return (
    <Image
      source={profile
        ? require('../../../assets/brand/sotos-profile.jpg')
        : require('../../../assets/brand/sotos-wordmark.png')}
      resizeMode="contain"
      accessible={!decorative}
      accessibilityLabel={decorative ? undefined : "Soto's"}
      style={[
        profile ? styles.profile : styles.wordmark,
        !profile && compact && styles.compact,
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  wordmark: {
    width: theme.auth.wordmarkWidth,
    height: theme.auth.wordmarkWidth / theme.auth.wordmarkAspectRatio,
  },
  compact: {
    width: theme.auth.wordmarkMobileWidth,
    height: theme.auth.wordmarkMobileWidth / theme.auth.wordmarkAspectRatio,
  },
  profile: {
    width: theme.auth.profileSize,
    height: theme.auth.profileSize,
    borderRadius: theme.radius.md,
  },
});
