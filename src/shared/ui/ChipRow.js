import { ScrollView, View } from 'react-native';
import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';
import { commonStyles } from '@/shared/styles/commonStyles';
import { styles } from '@/shared/styles/components/chipRow';

/**
 * Fila de chips (categorías, filtros, pestañas). Con espacio se acomodan en
 * varias líneas; en pantallas compactas forman una tira que se desliza de lado,
 * para no empujar el contenido hacia abajo.
 *
 * @param {Object} props
 * @param {'compact' | 'always'} [props.scroll]  `always`: siempre en una sola tira (p. ej. las categorías de Caja)
 */
export function ChipRow({ scroll = 'compact', children, style }) {
  const { compact } = useResponsiveLayout();

  if (scroll === 'always' || compact) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={[styles.scroller, style]} contentContainerStyle={styles.scrollerContent}>
        {children}
      </ScrollView>
    );
  }
  return <View style={[commonStyles.chips, style]}>{children}</View>;
}
