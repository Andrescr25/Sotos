import { Ionicons } from '@react-native-vector-icons/ionicons';
import { theme } from '@/shared/theme';

/**
 * Único lugar que conoce la librería de iconos. Si se cambia de librería,
 * solo se modifica este archivo.
 *
 * @param {Object} props
 * @param {string} props.name  nombre del icono (ver Ionicons)
 * @param {'sm' | 'md' | 'lg'} [props.size]
 * @param {keyof typeof theme.colors} [props.color]  nombre de color del tema
 */
export function Icon({ name, size = 'md', color = 'textPrimary' }) {
  return <Ionicons name={name} size={theme.sizes.icon[size]} color={theme.colors[color]} />;
}
