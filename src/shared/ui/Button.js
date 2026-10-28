import { theme } from '@/shared/theme';
import { Pressable } from 'react-native';
import { styles } from '@/shared/styles/components/button';
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
 * @param {boolean} [props.compact]  versión más baja para barras y filas
 * @param {string} [props.accessibilityLabel]  nombre para lectores de pantalla si debe distinguirse del texto (p. ej. en listas)
 */
export function Button({ label, onPress, variant = 'primary', icon, disabled = false, compact = false, accessibilityLabel, style }) {
  const palette = VARIANTS[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        { backgroundColor: pressed ? palette.pressed : palette.background },
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon ? <Icon name={icon} size="sm" color={palette.content} /> : null}
      <Text variant="label" color={palette.content} style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}
