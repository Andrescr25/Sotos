import { Pressable } from 'react-native';
import { commonStyles } from '@/shared/styles/commonStyles';
import { Icon } from './Icon';

/**
 * Botón cuadrado con solo un icono (editar, subir, quitar, cerrar). El nombre
 * accesible es obligatorio: sin texto visible, es lo único que lo describe.
 *
 * @param {Object} props
 * @param {string} props.icon
 * @param {string} props.label  nombre accesible, p. ej. "Editar Papas"
 * @param {() => void} props.onPress
 * @param {boolean} [props.disabled]
 * @param {keyof typeof import('@/shared/theme').theme.colors} [props.color]
 * @param {'sm' | 'md' | 'lg'} [props.size]
 */
export function IconButton({ icon, label, onPress, disabled = false, color = 'textSecondary', size = 'sm', style }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [commonStyles.iconButton, pressed && commonStyles.iconButtonPressed, style]}
    >
      <Icon name={icon} size={size} color={color} />
    </Pressable>
  );
}
