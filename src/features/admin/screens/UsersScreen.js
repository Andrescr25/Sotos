import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ASSIGNABLE_ROLES, ROLE_LABELS } from '@/domain/users';
import { SessionBar, useAuth } from '@/features/auth';
import { getErrorMessage } from '@/shared/errors/messages';
import { commonStyles } from '@/shared/styles/commonStyles';
import { theme } from '@/shared/theme';
import { Banner, Button, Chip, Screen, Spinner, Text, Toggle } from '@/shared/ui';
import { InviteFormSheet } from '../components/InviteFormSheet';
import { InviteLinkSheet } from '../components/InviteLinkSheet';
import { useUsers } from '../hooks/useUsers';

/**
 * Cuentas del personal: invitar a un empleado (el sistema genera un enlace
 * para que cree su contraseña), asignar el rol, habilitar o deshabilitar, y
 * generar un enlace nuevo si alguien olvidó su contraseña.
 */
export default function UsersScreen() {
  const router = useRouter();
  const { user: me } = useAuth();
  const {
    users,
    pendingCount,
    loading,
    error,
    busyId,
    assignRole,
    setActive,
    createAccount,
    createInvitation,
    reload,
  } = useUsers();

  const [inviting, setInviting] = useState(false);
  const [issued, setIssued] = useState(null); // { user, invitation } para mostrar el enlace

  async function submitInvite(input) {
    const result = await createAccount(input);
    if (result.ok) {
      setInviting(false);
      setIssued(result.result);
    }
    return result;
  }

  async function issueLink(account) {
    const result = await createInvitation(account.id);
    if (result.ok) setIssued(result.result);
  }

  return (
    <Screen>
      <View style={[commonStyles.rowBetween, styles.header]}>
        <View style={commonStyles.row}>
          <Button compact variant="secondary" icon="arrow-back" label="Volver" onPress={() => router.back()} />
          <Text variant="headline" style={styles.title}>
            Usuarios y accesos
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Button compact icon="person-add" label="Invitar empleado" onPress={() => setInviting(true)} />
          <SessionBar />
        </View>
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
            const invited = !account.passwordSet;
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
                  {invited ? (
                    <Text variant="caption" color="info">
                      Invitación enviada: todavía no crea su contraseña.
                    </Text>
                  ) : null}
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
                  {account.active && !isMe ? (
                    <Button
                      compact
                      variant="secondary"
                      icon={invited ? 'link' : 'key'}
                      label={
                        invited
                          ? `Nuevo enlace de ${account.name}`
                          : `Restablecer contraseña de ${account.name}`
                      }
                      disabled={busy}
                      onPress={() => issueLink(account)}
                    />
                  ) : null}
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

      {inviting ? (
        <InviteFormSheet busy={false} onSubmit={submitInvite} onClose={() => setInviting(false)} />
      ) : null}

      {issued ? (
        <InviteLinkSheet user={issued.user} invitation={issued.invitation} onClose={() => setIssued(null)} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: theme.spacing.lg, gap: theme.spacing.lg, flexWrap: 'wrap' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg },
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
