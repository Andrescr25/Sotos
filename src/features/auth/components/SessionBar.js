import { View } from 'react-native';
import { styles } from '@/shared/styles/components/sessionBar';
import { IconButton, Text } from '@/shared/ui';
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
      <IconButton icon="log-out-outline" label="Salir" onPress={logout} />
    </View>
  );
}
