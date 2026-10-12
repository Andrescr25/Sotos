import { useRouter } from 'expo-router';
import { useState } from 'react';
import { getErrorMessage } from '@/shared/errors/messages';
import { Banner, Button, TextField } from '@/shared/ui';
import { useAuth } from '../AuthProvider';
import { AuthCard } from '../components/AuthCard';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await register({ name, username, password });
      router.replace('/'); // sin rol todavía: la raíz te lleva a "acceso pendiente"
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      icon="person-add"
      title="Crear cuenta"
      subtitle="Después de crearla, un administrador te asignará tu acceso."
    >
      {error ? <Banner tone="error" message={error} /> : null}

      <TextField
        label="Nombre"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoComplete="name"
        returnKeyType="next"
      />
      <TextField
        label="Usuario (para iniciar sesión)"
        value={username}
        onChangeText={setUsername}
        autoComplete="username"
        returnKeyType="next"
      />
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
        label={busy ? 'Creando…' : 'Crear cuenta'}
        icon="checkmark"
        onPress={submit}
        disabled={busy || !name || !username || !password || !confirm}
      />
      <Button label="Ya tengo cuenta" variant="secondary" onPress={() => router.back()} />
    </AuthCard>
  );
}
