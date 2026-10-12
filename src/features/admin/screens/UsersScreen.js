import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ASSIGNABLE_ROLES, ROLE_LABELS } from '@/domain/users';
import { SessionBar, useAuth } from '@/features/auth';
import { getErrorMessage } from '@/shared/errors/messages';
import { commonStyles } from '@/shared/styles/commonStyles';
import { theme } from '@/shared/theme';
import { Banner, Button, Chip, Screen, Spinner, Text, Toggle } from '@/shared/ui';
import { useUsers } from '../hooks/useUsers';

export default function UsersScreen() {
  const router = useRouter();
  const { user: me } = useAuth();
  const { users, pendingCount, loading, error, busyId, assignRole, setActive, reload } = useUsers();

  return (
    <Screen>
      <View style={[commonStyles.rowBetween, styles.header]}>
        <View style={commonStyles.row}>
          <Button compact variant="secondary" icon="arrow-back" label="Volver" onPress={() => router.back()} />
          <Text variant="headline" style={styles.title}>
            Usuarios y accesos
          </Text>
        </View>
        <SessionBar />
      </View>

      {pendingCount > 0 ? (
        <Banner
          tone="warning"
          message={`${pendingCount} ${pendingCount === 1 ? 'cuenta espera' : 'cuentas esperan'} que le asignes un acceso.`}
          style={styles.banner}
        />
      ) : null}
      {error ? (
        <Banner tone="error" message={getErrorMessage(error)} style={styles.banner} onDismiss={reload} />
      ) : null}

      {loading ? (
        <Spinner message="Cargando usuarios…" />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {users.map((account) => {
            const isMe = account.id === me?.id;
            const pending = account.active && !account.role;
            const busy = busyId === account.id;

            return (
              <View
                key={account.id}
                style={[commonStyles.card, styles.row, pending && styles.pending, !account.active && styles.disabled]}
              >
                <View style={styles.identity}>
                  <Text variant="bodyLarge" style={styles.name}>
                    {account.name}
                    {isMe ? '  (tú)' : ''}
                  </Text>
                  <Text color="textSecondary">@{account.username}</Text>
                  {pending ? (
                    <Text variant="caption" color="warning">
                      Sin acceso: asígnale un rol para que pueda trabajar.
                    </Text>
                  ) : null}
                  {!account.active ? (
                    <Text variant="caption" color="danger">
                      Cuenta deshabilitada
                    </Text>
                  ) : null}
                </View>

                <View style={styles.controls}>
                  <View style={styles.roles}>
                    <Chip
                      label="Sin acceso"
                      selected={!account.role}
                      onPress={() => account.role && !busy && !isMe && assignRole(account.id, null)}
                    />
                    {ASSIGNABLE_ROLES.map((role) => (
                      <Chip
                        key={role}
                        label={ROLE_LABELS[role]}
                        selected={account.role === role}
                        onPress={() => account.role !== role && !busy && !isMe && assignRole(account.id, role)}
                      />
                    ))}
                  </View>
                  <Toggle
                    label="Cuenta habilitada"
                    value={account.active}
                    disabled={busy || isMe}
                    onValueChange={(value) => setActive(account.id, value)}
                  />
                  {isMe ? (
                    <Text variant="caption" color="textSecondary">
                      No puedes cambiar tu propio acceso.
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: theme.spacing.lg, gap: theme.spacing.lg },
  title: { marginLeft: theme.spacing.lg },
  banner: { marginBottom: theme.spacing.md },
  list: { gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: theme.spacing.lg },
  pending: { backgroundColor: theme.colors.warningSoft },
  disabled: { opacity: 0.6 },
  identity: { flexGrow: 1, flexShrink: 1, minWidth: 220, gap: theme.spacing.xs },
  name: { fontWeight: theme.fontWeights.bold },
  controls: { gap: theme.spacing.md, alignItems: 'flex-end', flexShrink: 1 },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, justifyContent: 'flex-end' },
});
