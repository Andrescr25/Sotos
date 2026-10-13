import { Pressable, View } from 'react-native';
import { commonStyles } from '@/shared/styles/commonStyles';
import { cardStyles as styles } from '@/shared/styles/components/cards';
import { Icon } from './Icon';
import { Text } from './Text';

/** Atajo de navegación reutilizable, con nombre accesible independiente del icono. */
export function ActionCard({ title, description, icon, onPress, style }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [commonStyles.card, styles.action, pressed && styles.pressed, style]}>
      <View style={styles.actionTop}>
        <View style={commonStyles.iconWell}><Icon name={icon} color="primary" /></View>
        <Icon name="arrow-forward" size="sm" color="textSecondary" />
      </View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text color="textSecondary" style={styles.description}>{description}</Text>
      </View>
    </Pressable>
  );
}
