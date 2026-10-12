import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { theme } from '@/shared/theme';
import { Icon } from './Icon';
import { Text } from './Text';

/**
 * Ventana emergente centrada (opciones de producto, notas, listas cortas).
 *
 * @param {Object} props
 * @param {boolean} props.visible
 * @param {string} props.title
 * @param {() => void} props.onClose
 * @param {import('react').ReactNode} [props.footer]  zona fija inferior (botones)
 * @param {string} [props.testID]
 */
export function Sheet({ visible, title, onClose, footer, testID, children }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={styles.sheet} testID={testID}>
          <View style={styles.header}>
            <Text variant="title" style={styles.title}>
              {title}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} hitSlop={12}>
              <Icon name="close" size="md" color="textSecondary" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body}>{children}</ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  title: { flex: 1 },
  body: { padding: theme.spacing.lg, gap: theme.spacing.lg },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
});
