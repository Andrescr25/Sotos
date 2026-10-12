import { Pressable, StyleSheet } from 'react-native';
import { theme } from '@/shared/theme';
import { Icon } from './Icon';
import { Text } from './Text';

/**
 * Botón en forma de píldora para filtros, categorías y atajos.
 *
 * @param {Object} props
 * @param {string} props.label
 * @param {boolean} [props.selected]
 * @param {string} [props.icon]
 * @param {() => void} [props.onPress]
 */
export function Chip({ label, selected = false, icon, onPress, style }) {
  const content = selected ? 'textInverse' : 'textPrimary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected, style]}
    >
      {icon ? <Icon name={icon} size="sm" color={content} /> : null}
      <Text variant="label" color={content}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 48,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  selected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
});
