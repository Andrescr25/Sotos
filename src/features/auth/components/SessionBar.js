import { Pressable, View } from 'react-native';
import { styles } from '@/shared/styles/components/sessionBar';
import { commonStyles } from '@/shared/styles/commonStyles';
import { Icon, Text } from '@/shared/ui';
import { useAuth } from '../AuthProvider';

/** Identidad de la sesión, compartida por todos los espacios de trabajo. */
export function SessionBar({ compact = false }) {
  const { user, logout } = useAuth();
  if (!user) return null;
  const initials = user.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <View style={styles.bar}>
      <View style={styles.avatar}><Text variant="caption" color="primary" style={styles.initials}>{initials}</Text></View>
      <View style={styles.identity}>
        <Text variant="caption" numberOfLines={1} style={styles.name}>{user.name}</Text>
        {!compact ? <Text variant="caption" color="textSecondary">@{user.username}</Text> : null}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Salir" onPress={logout} style={({ pressed }) => [commonStyles.iconButton, pressed && styles.pressed]}>
        <Icon name="log-out-outline" size="sm" color="textSecondary" />
      </Pressable>
    </View>
  );
}
