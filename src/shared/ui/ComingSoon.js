import { StyleSheet, View } from 'react-native';
import { commonStyles } from '@/shared/styles/commonStyles';
import { theme } from '@/shared/theme';
import { Button } from './Button';
import { Icon } from './Icon';
import { Screen } from './Screen';
import { Text } from './Text';

/** Pantalla provisional para módulos que todavía no se construyen. */
export function ComingSoon({ icon, title, description, onBack }) {
  return (
    <Screen style={commonStyles.center}>
      <View style={styles.content}>
        <Icon name={icon} size="lg" color="textSecondary" />
        <Text variant="headline">{title}</Text>
        <Text color="textSecondary" style={styles.description}>
          {description}
        </Text>
        {onBack ? <Button label="Volver" icon="arrow-back" variant="secondary" onPress={onBack} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', gap: theme.spacing.lg },
  description: { textAlign: 'center' },
});
