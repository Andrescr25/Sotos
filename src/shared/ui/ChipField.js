import { View } from 'react-native';
import { commonStyles } from '@/shared/styles/commonStyles';
import { Chip } from './Chip';
import { Text } from './Text';

/**
 * Elegir una o varias opciones con chips, con su etiqueta (tipo, categoría,
 * acceso, forma de pago…). La selección la decide la pantalla con `isSelected`
 * y `onSelect`, así sirve igual para elegir una opción o varias.
 *
 * @param {Object} props
 * @param {string} [props.label]
 * @param {{ key: string | number | null, label: string, icon?: string, style?: object }[]} props.options
 * @param {(key: string | number | null) => boolean} props.isSelected
 * @param {(key: string | number | null) => void} props.onSelect
 * @param {boolean} [props.disabled]
 * @param {string} [props.hint]  explicación bajo las opciones
 */
export function ChipField({ label, options, isSelected, onSelect, disabled = false, hint }) {
  return (
    <View style={commonStyles.group}>
      {label ? <Text variant="label" color="textSecondary">{label}</Text> : null}
      <View style={commonStyles.chips}>
        {options.map((option) => (
          <Chip
            key={String(option.key)}
            label={option.label}
            icon={option.icon}
            style={option.style}
            disabled={disabled}
            selected={isSelected(option.key)}
            onPress={() => onSelect(option.key)}
          />
        ))}
      </View>
      {hint ? <Text variant="caption" color="textSecondary">{hint}</Text> : null}
    </View>
  );
}
