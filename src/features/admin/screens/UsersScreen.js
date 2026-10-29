import { useState } from 'react';
import { View } from 'react-native';
import { ASSIGNABLE_ROLES, ROLE_LABELS } from '@/domain/users';
import { useAuth } from '@/features/auth';
import { getErrorMessage } from '@/shared/errors/messages';
import { commonStyles } from '@/shared/styles/commonStyles';
import { styles } from '@/shared/styles/screens/users';
import { WorkspaceScreen } from '@/features/workspace/components/WorkspaceScreen';
import { Banner, Button, Chip, Spinner, Text, Toggle } from '@/shared/ui';
import { InviteFormSheet } from '../components/InviteFormSheet';
import { InviteLinkSheet } from '../components/InviteLinkSheet';
import { useUsers } from '../hooks/useUsers';

/**
 * Cuentas del personal: invitar a un empleado (el sistema genera un enlace
 * para que cree su contraseña), asignar el rol, habilitar o deshabilitar, y
 * generar un enlace nuevo si alguien olvidó su contraseña.
 */
export default function UsersScreen() {
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
    <WorkspaceScreen section="users" title="Usuarios y accesos" subtitle="Un buen equipo empieza con las personas." back scroll actions={<Button compact icon="person-add-outline" label="Invitar empleado" onPress={() => setInviting(true)} />}>
      {pendingCount > 0 ? (
        <Banner
          tone="warning"
          message={`${pendingCount} ${pendingCount === 1 ? 'cuenta espera' : 'cuentas esperan'} que le asignes un acceso.`}
        />
      ) : null}
      {error ? (
        <Banner tone="error" message={getErrorMessage(error)} onDismiss={reload} />
      ) : null}

      {loading ? (
        <Spinner message="Cargando usuarios…" />
      ) : (
        <>
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
                      disabled={busy || isMe}
                      selected={!account.role}
                      onPress={() => account.role && !busy && !isMe && assignRole(account.id, null)}
                    />
                    {ASSIGNABLE_ROLES.map((role) => (
                      <Chip
                        key={role}
                        label={ROLE_LABELS[role]}
                        disabled={busy || isMe}
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
        </>
      )}

      {inviting ? (
        <InviteFormSheet busy={false} onSubmit={submitInvite} onClose={() => setInviting(false)} />
      ) : null}

      {issued ? (
        <InviteLinkSheet user={issued.user} invitation={issued.invitation} onClose={() => setIssued(null)} />
      ) : null}
    </WorkspaceScreen>
  );
}
