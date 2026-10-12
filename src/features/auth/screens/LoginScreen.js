import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { devAccounts } from '@/config/runtime';
import { getErrorMessage } from '@/shared/errors/messages';
import { theme } from '@/shared/theme';
import { Banner, Button, Chip, Text, TextField } from '@/shared/ui';
import { useAuth } from '../AuthProvider';
import { AuthCard } from '../components/AuthCard';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await login({ username, password });
      router.replace('/'); // la raíz te lleva a la zona que el administrador te asignó
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Sotos" subtitle="Inicia sesión para continuar">
      {error ? <Banner tone="error" message={error} /> : null}

      <TextField
        label="Usuario"
        value={username}
        onChangeText={setUsername}
        autoComplete="username"
        returnKeyType="next"
      />
      <TextField
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />

      <Button
        label={busy ? 'Entrando…' : 'Entrar'}
        icon="log-in"
        onPress={submit}
        disabled={busy || !username || !password}
      />
      <Button label="Crear cuenta" icon="person-add" variant="secondary" onPress={() => router.push('/registro')} />

      <Text variant="caption" color="textSecondary" style={styles.note}>
        ¿Primera vez? Crea tu cuenta; un administrador te asignará tu acceso.
      </Text>

      {devAccounts.length > 0 ? (
        <DevAccounts
          accounts={devAccounts}
          onPick={(account) => {
            setUsername(account.username);
            setPassword(account.password);
          }}
        />
      ) : null}
    </AuthCard>
  );
}

/** Solo en modo desarrollo sin servidor: atajos a las cuentas de ejemplo. */
function DevAccounts({ accounts, onPick }) {
  return (
    <View style={styles.dev}>
      <Text variant="caption" color="textSecondary">
        Modo desarrollo (sin servidor) — cuentas de ejemplo:
      </Text>
      <View style={styles.devChips}>
        {accounts.map((account) => (
          <Chip key={account.id} label={account.username} onPress={() => onPick(account)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { textAlign: 'center' },
  dev: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.warningSoft,
  },
  devChips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
});
