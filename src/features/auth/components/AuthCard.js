import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { commonStyles } from '@/shared/styles/commonStyles';
import { theme } from '@/shared/theme';
import { Icon, Screen, Text } from '@/shared/ui';

/** Marco común de las pantallas de acceso (login, registro, acceso pendiente). */
export function AuthCard({ icon = 'restaurant', title, subtitle, children }) {
  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={commonStyles.fill}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[commonStyles.card, styles.card]}>
            <View style={styles.header}>
              <Icon name={icon} size="lg" color="primary" />
              <Text variant="headline">{title}</Text>
              {subtitle ? (
                <Text color="textSecondary" style={styles.subtitle}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', maxWidth: 460, gap: theme.spacing.lg, padding: theme.spacing.xl },
  header: { alignItems: 'center', gap: theme.spacing.sm },
  subtitle: { textAlign: 'center' },
});
