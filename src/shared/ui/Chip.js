import { Pressable } from 'react-native';
import { styles } from '@/shared/styles/components/chip';
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
export function Chip({ label, selected = false, icon, onPress, disabled = false, style }) {
  const content = selected ? 'textInverse' : 'textPrimary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed, disabled && styles.disabled, style]}
    >
      {icon ? <Icon name={icon} size="sm" color={content} /> : null}
      <Text variant="label" color={content} style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}
