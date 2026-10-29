import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';
import { styles } from '@/shared/styles/components/sheet';
import { IconButton } from './IconButton';
import { SheetActions } from './SheetActions';
import { Text } from './Text';

/**
 * Modal compartido: respeta el área segura y conserva el pie visible con teclado.
 * En pantallas compactas (teléfono, poca altura) reduce márgenes y acomoda las
 * acciones lado a lado para dejar más espacio al contenido.
 *
 * El pie se declara con `primaryAction` (+ `secondaryAction`) y todos los modales
 * se ven y se comportan igual. `footer` queda para pies con contenido propio.
 *
 * @param {Object} props
 * @param {boolean} props.visible
 * @param {string} props.title
 * @param {() => void} props.onClose
 * @param {import('./SheetActions').SheetAction} [props.primaryAction]
 * @param {import('./SheetActions').SheetAction} [props.secondaryAction]
 * @param {import('react').ReactNode} [props.footer]
 * @param {string} [props.testID]
 */
export function Sheet({ visible, title, onClose, primaryAction, secondaryAction, footer, testID, children }) {
  const { compact } = useResponsiveLayout();
  const actions = footer ?? (primaryAction ? <SheetActions primary={primaryAction} secondary={secondaryAction} /> : null);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={[styles.overlay, compact && styles.overlayCompact]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.avoid}>
          <View accessibilityViewIsModal style={styles.sheet} testID={testID}>
            <View style={[styles.header, compact && styles.headerCompact]}>
              <Text variant="title" accessibilityRole="header" style={styles.title}>{title}</Text>
              <IconButton icon="close" label="Cerrar" onPress={onClose} />
            </View>
            <ScrollView style={styles.scroll} contentContainerStyle={[styles.body, compact && styles.bodyCompact]} keyboardShouldPersistTaps="handled">{children}</ScrollView>
            {actions ? <View style={[styles.footer, compact && styles.footerCompact]}>{actions}</View> : null}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
