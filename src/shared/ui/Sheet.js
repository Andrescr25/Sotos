import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';
import { styles } from '@/shared/styles/components/sheet';
import { commonStyles } from '@/shared/styles/commonStyles';
import { Icon } from './Icon';
import { Text } from './Text';

/** Modal compartido: respeta el área segura y conserva el pie visible con teclado. */
export function Sheet({ visible, title, onClose, footer, testID, children }) {
  const { mobile } = useResponsiveLayout();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={[styles.overlay, mobile && styles.overlayMobile]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.avoid}>
          <View accessibilityViewIsModal style={styles.sheet} testID={testID}>
            <View style={styles.header}>
              <Text variant="title" accessibilityRole="header" style={styles.title}>{title}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} style={commonStyles.iconButton}><Icon name="close" size="sm" color="textSecondary" /></Pressable>
            </View>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">{children}</ScrollView>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
