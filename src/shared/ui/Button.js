import { Pressable, StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';
import { Icon } from './Icon';
import { Text } from './Text';

const VARIANTS = {
  primary: {
    background: theme.colors.primary,
    pressed: theme.colors.primaryPressed,
    content: 'textInverse',
  },
  secondary: {
    background: theme.colors.surfaceMuted,
    pressed: theme.colors.border,
    content: 'textPrimary',
  },
  danger: {
    background: theme.colors.danger,
    pressed: theme.colors.danger,
    content: 'textInverse',
  },
};

/**
 * @param {Object} props
 * @param {string} props.label
 * @param {() => void} props.onPress
 * @param {keyof typeof VARIANTS} [props.variant]
 * @param {string} [props.icon]  nombre de icono a la izquierda
 * @param {boolean} [props.disabled]
 */
export function Button({ label, onPress, variant = 'primary', icon, disabled = false, style }) {
  const palette = VARIANTS[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: pressed ? palette.pressed : palette.background },
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon ? <Icon name={icon} color={palette.content} /> : null}
      <Text variant="label" color={palette.content}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: theme.sizes.touchTarget,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  disabled: { opacity: 0.4 },
});
