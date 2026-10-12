import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ROLE_LABELS } from '@/domain/users';
import { getErrorMessage } from '@/shared/errors/messages';
import { Banner, Button, Spinner, Text, TextField } from '@/shared/ui';
import { useAuth } from '../AuthProvider';
import { AuthCard } from '../components/AuthCard';

/**
 * El empleado abre el enlace que le envió el administrador y crea su
 * contraseña. Al terminar queda con la sesión abierta y entra a la zona del
 * rol que el administrador le asignó.
 */
export default function InvitationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const { user: current, getInvitation, acceptInvitation } = useAuth();

  const [lookup, setLookup] = useState({ status: 'loading' });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getInvitation(token)
      .then((info) => active && setLookup({ status: 'ready', info }))
      .catch((caught) => active && setLookup({ status: 'invalid', error: caught }));
    return () => {
      active = false;
    };
    // `getInvitation` cambia con el estado de sesión; el enlace solo con el token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function submit() {
    if (busy) return;
    if (password !== confirm) return setError('Las contraseñas no coinciden.');

    setBusy(true);
    setError(null);
    try {
      await acceptInvitation(token, password);
      router.replace('/'); // la raíz lleva a la zona asignada (o a "acceso pendiente")
    } catch (caught) {
      setError(getErrorMessage(caught));
      // Si el enlace dejó de servir mientras se escribía, se muestra como tal.
      if (['invitation_invalid', 'invitation_expired', 'invitation_used'].includes(caught?.code)) {
        setLookup({ status: 'invalid', error: caught });
      }
    } finally {
      setBusy(false);
    }
  }

  if (lookup.status === 'loading') return <Spinner message="Revisando tu enlace…" />;

  if (lookup.status === 'invalid') {
    return (
      <AuthCard icon="alert-circle" title="Enlace no válido" subtitle={getErrorMessage(lookup.error)}>
        <Button label="Ir al inicio de sesión" icon="log-in" onPress={() => router.replace('/')} />
      </AuthCard>
    );
  }

  const { info } = lookup;
  const roleText = info.role ? ROLE_LABELS[info.role] : null;

  return (
    <AuthCard
      icon="key"
      title={info.isReset ? 'Crea tu contraseña nueva' : `Bienvenido, ${info.name}`}
      subtitle={
        info.isReset
          ? `Hola ${info.name}. Elige una contraseña nueva para tu usuario “${info.username}”.`
          : `Tu usuario es “${info.username}”${roleText ? ` y tu acceso es de ${roleText}` : ''}. Crea tu contraseña para entrar.`
      }
    >
      {current ? (
        <Banner
          tone="info"
          message={`Hay una sesión abierta como ${current.name}. Al continuar se cambiará a ${info.name}.`}
        />
      ) : null}
      {error ? <Banner tone="error" message={error} /> : null}

      <TextField
        label="Contraseña (mínimo 6 caracteres)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        returnKeyType="next"
      />
      <TextField
        label="Repite la contraseña"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoComplete="new-password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <Button
        icon="checkmark"
        label={busy ? 'Guardando…' : 'Guardar contraseña y entrar'}
        onPress={submit}
        disabled={busy || !password || !confirm}
      />
      <Text variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
        Después entrarás con tu usuario y esta contraseña.
      </Text>
    </AuthCard>
  );
}
