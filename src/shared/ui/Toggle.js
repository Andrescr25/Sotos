import { StyleSheet, Switch, View } from 'react-native';
import { theme } from '@/shared/theme';
import { Text } from './Text';

/**
 * Interruptor con etiqueta.
 *
 * @param {Object} props
 * @param {string} props.label
 * @param {boolean} props.value
 * @param {(value: boolean) => void} props.onValueChange
 * @param {boolean} [props.disabled]
 */
export function Toggle({ label, value, onValueChange, disabled = false, style }) {
  return (
    <View style={[styles.row, style]}>
      <Text variant="label">{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: theme.colors.border, true: theme.colors.success }}
        thumbColor={theme.colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
});
