import { Pressable, StyleSheet, View } from 'react-native';
import { theme } from '@/shared/theme';
import { Icon } from './Icon';
import { Text } from './Text';

const TONES = {
  error: { background: 'dangerSoft', accent: 'danger', icon: 'alert-circle' },
  success: { background: 'successSoft', accent: 'success', icon: 'checkmark-circle' },
  info: { background: 'infoSoft', accent: 'info', icon: 'information-circle' },
  warning: { background: 'warningSoft', accent: 'warning', icon: 'alert-circle' },
};

/**
 * Aviso en línea (error, éxito, información).
 *
 * @param {Object} props
 * @param {'error' | 'success' | 'info' | 'warning'} [props.tone]
 * @param {string} props.message
 * @param {() => void} [props.onDismiss]  si se da, muestra el botón de cerrar
 */
export function Banner({ tone = 'info', message, onDismiss, style }) {
  const palette = TONES[tone];

  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: theme.colors[palette.background] }, style]}
    >
      <Icon name={palette.icon} color={palette.accent} />
      <Text style={styles.message}>{message}</Text>
      {onDismiss ? (
        <Pressable accessibilityLabel="Cerrar aviso" onPress={onDismiss} hitSlop={12}>
          <Icon name="close" color="textSecondary" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
  },
  message: { flex: 1 },
});
