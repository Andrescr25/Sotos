import { useState } from 'react';
import { ChipField, Sheet, TextField } from '@/shared/ui';

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
      primaryAction={{ icon: 'checkmark', label: 'Guardar', onPress: () => onSave([...selected, custom]) }}
    >
      <ChipField options={options.map((note) => ({ key: note, label: note }))} isSelected={(note) => selected.includes(note)} onSelect={toggle} />
      <TextField
        placeholder="Otra observación"
        value={custom}
        onChangeText={setCustom}
        autoCapitalize="sentences"
      />
    </Sheet>
  );
}
