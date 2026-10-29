import { View } from 'react-native';
import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';
import { styles } from '@/shared/styles/components/callout';
import { Text } from './Text';

/**
 * Cifra destacada con su explicación: el total a cobrar, el vuelto, lo que
 * falta, si la caja cuadra. El color indica el significado (verde bien, ámbar
 * atención, rojo problema); el texto lo dice con palabras, no solo con color.
 *
 * Con poco espacio vertical (`compact`) se acomoda en una fila para no quitarle
 * altura al formulario que tiene al lado.
 *
 * @param {Object} props
 * @param {'primary' | 'success' | 'warning' | 'danger'} [props.tone]
 * @param {string} [props.title]  línea superior (p. ej. a nombre de quién)
 * @param {string} props.caption  qué es la cifra
 * @param {string} props.value
 * @param {'headline' | 'display'} [props.size]
 * @param {boolean} [props.live]  anunciarlo a lectores de pantalla cuando cambie
 */
export function Callout({ tone = 'primary', title, caption, value, size = 'headline', live = false, style }) {
  const { compact } = useResponsiveLayout();
  const copy = (
    <>
      {title ? <Text color="textSecondary">{title}</Text> : null}
      <Text variant="caption" color={tone === 'primary' ? 'textSecondary' : tone}>{caption}</Text>
    </>
  );

  return (
    <View
      style={[styles.base, styles[tone], compact && styles.compact, style]}
      accessibilityLiveRegion={live ? 'polite' : undefined}
    >
      {compact ? <View style={styles.copy}>{copy}</View> : copy}
      <Text variant={compact ? 'headline' : size} color={tone}>{value}</Text>
    </View>
  );
}
