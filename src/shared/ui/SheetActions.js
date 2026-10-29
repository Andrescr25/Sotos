import { View } from 'react-native';
import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';
import { styles } from '@/shared/styles/components/sheetActions';
import { Button } from './Button';

/**
 * Acciones del pie de un modal: una principal y, si hace falta, una secundaria
 * (cancelar, volver). En pantallas compactas van lado a lado para ceder altura
 * al contenido; si no caben, una debajo de la otra.
 *
 * @typedef {{ label: string, onPress: () => void, icon?: string, disabled?: boolean, variant?: 'primary' | 'secondary' | 'danger' }} SheetAction
 * @param {Object} props
 * @param {SheetAction} props.primary
 * @param {SheetAction} [props.secondary]
 */
export function SheetActions({ primary, secondary }) {
  const { compact } = useResponsiveLayout();
  const inline = compact && Boolean(secondary);

  return (
    <View style={inline ? styles.inline : styles.stacked}>
      <Button {...primary} style={inline ? styles.primary : undefined} />
      {secondary ? <Button variant="secondary" {...secondary} style={inline ? styles.secondary : undefined} /> : null}
    </View>
  );
}
