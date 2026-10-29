import { useState } from 'react';
import { MENU_ICONS } from '@/domain/menu';
import { getErrorMessage } from '@/shared/errors/messages';
import { styles } from '@/shared/styles/components/forms';
import { Banner, ChipField, Sheet, TextField, Toggle } from '@/shared/ui';

import { DeleteSection } from './DeleteSection';

const ICON_OPTIONS = [
  { key: null, label: 'Sin icono' },
  ...MENU_ICONS.map((name) => ({ key: name, label: '', icon: name, style: styles.iconChip })),
];

/**
 * Crear o editar una categoría (Platillos, Bebidas, Postres…).
 *
 * @param {Object} props
 * @param {import('@/domain/menu/types').Category | null} props.category  null = nueva
 * @param {number} [props.productCount]  productos que tiene (para avisar al eliminar)
 * @param {boolean} props.busy
 * @param {unknown} props.error
 * @param {(data: object) => Promise<{ ok: boolean }>} props.onSave
 * @param {() => Promise<{ ok: boolean }>} [props.onDelete]
 * @param {() => void} props.onClose
 */
export function CategoryFormSheet({ category, productCount = 0, busy, error, onSave, onDelete, onClose }) {
  const editing = Boolean(category);
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? null);
  const [active, setActive] = useState(category?.active ?? true);
  const [localError, setLocalError] = useState(null);

  async function save() {
    if (!name.trim()) return setLocalError('Escribe el nombre.');
    setLocalError(null);
    const data = { name, icon };
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
      testID="category-form"
      title={editing ? 'Editar categoría' : 'Nueva categoría'}
      onClose={onClose}
      primaryAction={{ icon: 'checkmark', label: busy ? 'Guardando…' : 'Guardar', onPress: save, disabled: busy }}
    >
      {message ? <Banner tone="error" message={message} /> : null}

      <TextField label="Nombre" value={name} onChangeText={setName} autoCapitalize="sentences" placeholder="Ej. Postres" />

      <ChipField label="Icono" options={ICON_OPTIONS} isSelected={(name) => icon === name} onSelect={setIcon} />

      {editing ? (
        <>
          <Toggle label="Visible en caja" value={active} onValueChange={setActive} />
          {productCount > 0 ? (
            <Banner
              tone="info"
              message={`Tiene ${productCount} producto${productCount === 1 ? '' : 's'}. Para eliminarla, primero elimina o mueve sus productos; o solo ocúltala.`}
            />
          ) : (
            <DeleteSection itemLabel="categoría" busy={busy} onConfirm={remove} />
          )}
        </>
      ) : null}
    </Sheet>
  );
}
