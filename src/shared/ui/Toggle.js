import { theme } from '@/shared/theme';
import { Platform, Switch, View } from 'react-native';
import { styles } from '@/shared/styles/components/toggle';
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
      <Text variant="label" style={styles.label}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor={theme.colors.surface}
        {...(Platform.OS === 'web' ? { activeThumbColor: theme.colors.surface } : {})}
      />
    </View>
  );
}
