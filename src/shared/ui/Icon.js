import { Ionicons } from '@react-native-vector-icons/ionicons';
import { theme } from '@/shared/theme';

const OUTLINE_ICONS = new Set(['restaurant', 'people', 'person', 'person-circle', 'person-add', 'receipt', 'flame', 'bag-check', 'cafe', 'fast-food', 'create', 'trash', 'chatbubble-ellipses', 'timer', 'albums', 'add-circle', 'log-out', 'key', 'copy', 'mail', 'link', 'alert-circle', 'information-circle', 'checkmark-circle']);

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
  return <Ionicons name={OUTLINE_ICONS.has(name) ? `${name}-outline` : name} size={theme.sizes.icon[size]} color={theme.colors[color]} />;
}
