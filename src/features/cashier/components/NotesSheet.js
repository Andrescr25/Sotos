import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '@/shared/theme';
import { Button, Chip, Sheet, TextField } from '@/shared/ui';

/**
 * Editar las observaciones de una línea ya agregada.
 *
 * @param {Object} props
 * @param {import('@/domain/orders/orderItem').OrderItem} props.item
 * @param {string[]} props.quickNotes
 * @param {(notes: string[]) => void} props.onSave
 * @param {() => void} props.onClose
 */
export function NotesSheet({ item, quickNotes, onSave, onClose }) {
  const [selected, setSelected] = useState(item.notes);
  const [custom, setCustom] = useState('');

  // Las observaciones que ya tenía la línea y no son atajos también se muestran.
  const options = [...quickNotes, ...item.notes.filter((note) => !quickNotes.includes(note))];

  const toggle = (note) =>
    setSelected((current) =>
      current.includes(note) ? current.filter((value) => value !== note) : [...current, note],
    );

  return (
    <Sheet
      visible
      title={`Observaciones · ${item.name}`}
      onClose={onClose}
      footer={<Button icon="checkmark" label="Guardar" onPress={() => onSave([...selected, custom])} />}
    >
      <View style={styles.chips}>
        {options.map((note) => (
          <Chip key={note} label={note} selected={selected.includes(note)} onPress={() => toggle(note)} />
        ))}
      </View>
      <TextField
        placeholder="Otra observación"
        value={custom}
        onChangeText={setCustom}
        autoCapitalize="sentences"
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
});
