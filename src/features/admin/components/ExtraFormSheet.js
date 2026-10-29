import { useState } from 'react';
import { getErrorMessage } from '@/shared/errors/messages';
import { parseColones } from '@/shared/utils/money';
import { Banner, Sheet, TextField, Toggle } from '@/shared/ui';
import { DeleteSection } from './DeleteSection';

/**
 * Crear o editar un extra (queso extra, tocino, salsa…).
 *
 * @param {Object} props
 * @param {import('@/domain/menu/types').Extra | null} props.extra  null = nuevo
 * @param {boolean} props.busy
 * @param {unknown} props.error
 * @param {(data: object) => Promise<{ ok: boolean }>} props.onSave
 * @param {() => Promise<{ ok: boolean }>} [props.onDelete]
 * @param {() => void} props.onClose
 */
export function ExtraFormSheet({ extra, busy, error, onSave, onDelete, onClose }) {
  const editing = Boolean(extra);
  const [name, setName] = useState(extra?.name ?? '');
  const [priceText, setPriceText] = useState(extra ? String(extra.price) : '');
  const [active, setActive] = useState(extra?.active ?? true);
  const [localError, setLocalError] = useState(null);

  async function save() {
    const price = parseColones(priceText);
    if (!name.trim()) return setLocalError('Escribe el nombre.');
    if (price === null) return setLocalError('Escribe el precio en colones, solo números (ej. 500).');

    setLocalError(null);
    const data = { name, price };
    const result = await onSave(editing ? { ...data, active } : data);
    if (result.ok) onClose();
  }

  async function remove() {
    const result = await onDelete();
    if (result.ok) onClose();
  }

  const message = localError ?? (error ? getErrorMessage(error) : null);

  return (
    <Sheet
      visible
      testID="extra-form"
      title={editing ? 'Editar extra' : 'Nuevo extra'}
      onClose={onClose}
      primaryAction={{ icon: 'checkmark', label: busy ? 'Guardando…' : 'Guardar', onPress: save, disabled: busy }}
    >
      {message ? <Banner tone="error" message={message} /> : null}

      <TextField label="Nombre" value={name} onChangeText={setName} autoCapitalize="sentences" placeholder="Ej. Queso extra" />
      <TextField
        label="Precio (₡)"
        value={priceText}
        onChangeText={setPriceText}
        keyboardType="number-pad"
        placeholder="Ej. 500"
      />

      {editing ? (
        <>
          <Toggle label="Visible en caja" value={active} onValueChange={setActive} />
          <DeleteSection
            itemLabel="extra"
            note="Se quitará de todos los productos que lo ofrecen. Los pedidos ya tomados no cambian."
            busy={busy}
            onConfirm={remove}
          />
        </>
      ) : null}
    </Sheet>
  );
}
