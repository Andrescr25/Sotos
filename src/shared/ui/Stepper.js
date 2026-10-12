import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '@/shared/theme';
import { Icon } from './Icon';
import { Text } from './Text';

/**
 * Selector de cantidad con botones − y +.
 *
 * @param {Object} props
 * @param {number} props.value
 * @param {(value: number) => void} props.onChange
 * @param {number} [props.min]
 * @param {number} [props.max]
 */
export function Stepper({ value, onChange, min = 0, max = Infinity, style }) {
  const canDecrease = value > min;
  const canIncrease = value < max;

  return (
    <View style={[styles.stepper, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Disminuir cantidad"
        disabled={!canDecrease}
        onPress={() => onChange(value - 1)}
        style={[styles.button, !canDecrease && styles.disabled]}
      >
        <Icon name="remove" />
      </Pressable>
      <Text variant="title" style={styles.value}>
        {value}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Aumentar cantidad"
        disabled={!canIncrease}
        onPress={() => onChange(value + 1)}
        style={[styles.button, !canIncrease && styles.disabled]}
      >
        <Icon name="add" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  button: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { minWidth: 36, textAlign: 'center' },
  disabled: { opacity: 0.35 },
});
