import { StyleSheet, Text as RNText } from 'react-native';
import { theme } from '@/shared/theme';

const VARIANTS = {
  display: { fontSize: theme.fontSizes.display, fontWeight: theme.fontWeights.bold },
  headline: { fontSize: theme.fontSizes.headline, fontWeight: theme.fontWeights.bold },
  title: { fontSize: theme.fontSizes.title, fontWeight: theme.fontWeights.bold },
  bodyLarge: { fontSize: theme.fontSizes.bodyLarge, fontWeight: theme.fontWeights.regular },
  body: { fontSize: theme.fontSizes.body, fontWeight: theme.fontWeights.regular },
  label: { fontSize: theme.fontSizes.body, fontWeight: theme.fontWeights.medium },
  caption: { fontSize: theme.fontSizes.caption, fontWeight: theme.fontWeights.regular },
};

/**
 * @param {Object} props
 * @param {keyof typeof VARIANTS} [props.variant]
 * @param {keyof typeof theme.colors} [props.color]  nombre de color del tema
 */
export function Text({ variant = 'body', color = 'textPrimary', style, ...rest }) {
  return (
    <RNText
      style={[styles.base, VARIANTS[variant], { color: theme.colors[color] }, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: { includeFontPadding: false, flexShrink: 1 },
});
