import { useState } from 'react';
import { ASSIGNABLE_ROLES, ROLE_LABELS, suggestUsername } from '@/domain/users';
import { getErrorMessage } from '@/shared/errors/messages';
import { Banner, ChipField, Sheet, Text, TextField } from '@/shared/ui';

const ROLE_OPTIONS = [
  ...ASSIGNABLE_ROLES.map((value) => ({ key: value, label: ROLE_LABELS[value] })),
  { key: null, label: 'Sin acceso todavía' },
];

/**
 * El administrador crea la cuenta de un empleado. No se escribe contraseña:
 * el sistema genera un enlace y el empleado la crea al abrirlo.
 *
 * @param {Object} props
 * @param {boolean} props.busy
 * @param {(input: { name: string, username: string, role: string | null }) => Promise<{ ok: boolean, error?: unknown }>} props.onSubmit
 * @param {() => void} props.onClose
 */
export function InviteFormSheet({ busy, onSubmit, onClose }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [role, setRole] = useState(null);
  const [error, setError] = useState(null);

  function changeName(value) {
    setName(value);
    // Mientras nadie edite el usuario a mano, se sugiere uno a partir del nombre.
    if (!usernameTouched) setUsername(suggestUsername(value));
  }

  async function submit() {
    if (!name.trim()) return setError('Escribe el nombre del empleado.');
    if (!username.trim()) return setError('Escribe el usuario con el que va a entrar.');

    setError(null);
    const result = await onSubmit({ name, username, role });
    if (!result.ok) setError(getErrorMessage(result.error));
  }

  return (
    <Sheet
      visible
      testID="invite-form"
      title="Invitar a un empleado"
      onClose={onClose}
      primaryAction={{ icon: 'link', label: busy ? 'Creando…' : 'Crear cuenta y generar enlace', onPress: submit, disabled: busy }}
    >
      {error ? <Banner tone="error" message={error} /> : null}

      <Text color="textSecondary">
        Tú no escribes su contraseña: se genera un enlace que le envías al empleado y con el que
        crea la suya.
      </Text>

      <TextField
        label="Nombre del empleado"
        value={name}
        onChangeText={changeName}
        autoCapitalize="words"
        placeholder="Ej. María Pérez"
      />
      <TextField
        label="Usuario (con el que va a iniciar sesión)"
        value={username}
        onChangeText={(value) => {
          setUsernameTouched(true);
          setUsername(value);
        }}
        placeholder="Ej. maria.perez"
      />

      <ChipField label="Acceso" options={ROLE_OPTIONS} isSelected={(value) => role === value} onSelect={setRole} />
    </Sheet>
  );
}
