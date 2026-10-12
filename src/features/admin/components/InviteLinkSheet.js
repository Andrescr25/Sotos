import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ROLE_LABELS } from '@/domain/users';
import { theme } from '@/shared/theme';
import { Banner, Button, Sheet, Text, TextField } from '@/shared/ui';
import { buildInviteMessage, buildInviteUrl, buildWhatsAppUrl } from '../inviteLink';

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('es-CR', { day: 'numeric', month: 'long' });

/**
 * Muestra el enlace de invitación para copiarlo y enviarlo al empleado.
 * Se ve una sola vez: el servidor guarda únicamente su huella.
 *
 * @param {Object} props
 * @param {import('@/domain/users/roles').User} props.user
 * @param {{ token: string, expiresAt: string }} props.invitation
 * @param {() => void} props.onClose
 */
export function InviteLinkSheet({ user, invitation, onClose }) {
  const [copied, setCopied] = useState(false);
  const [problem, setProblem] = useState(null);

  const url = buildInviteUrl(invitation.token);
  const isReset = user.passwordSet;
  const message = buildInviteMessage({ name: user.name, url, isReset });

  async function copy() {
    try {
      await Clipboard.setStringAsync(url);
      setCopied(true);
      setProblem(null);
    } catch {
      setProblem('No se pudo copiar automáticamente. Mantén presionado el enlace y cópialo.');
    }
  }

  async function openWhatsApp() {
    try {
      await Linking.openURL(buildWhatsAppUrl(message));
    } catch {
      setProblem('No se pudo abrir WhatsApp. Copia el enlace y envíalo por el medio que prefieras.');
    }
  }

  return (
    <Sheet
      visible
      testID="invite-link"
      title={isReset ? `Contraseña nueva para ${user.name}` : `Enlace para ${user.name}`}
      onClose={onClose}
      footer={<Button variant="secondary" label="Listo" onPress={onClose} />}
    >
      <Banner
        tone="success"
        message={
          isReset
            ? 'Listo. Con este enlace la persona crea una contraseña nueva; la anterior dejará de servir.'
            : `Cuenta creada${user.role ? ` con acceso de ${ROLE_LABELS[user.role]}` : ' (sin acceso todavía)'}. Envía este enlace al empleado para que cree su contraseña.`
        }
      />

      <View style={styles.group}>
        <TextField label="Enlace" value={url} editable={false} selectTextOnFocus multiline />
        <Button
          icon={copied ? 'checkmark' : 'copy'}
          label={copied ? '¡Copiado!' : 'Copiar enlace'}
          onPress={copy}
        />
        <Button icon="logo-whatsapp" variant="secondary" label="Enviar por WhatsApp" onPress={openWhatsApp} />
      </View>

      {problem ? <Banner tone="warning" message={problem} /> : null}

      <Text variant="caption" color="textSecondary">
        Sirve una sola vez y vence el {formatDate(invitation.expiresAt)}. Por seguridad no se
        puede volver a ver: si se pierde, genera uno nuevo desde la lista de usuarios.
      </Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  group: { gap: theme.spacing.md },
});
