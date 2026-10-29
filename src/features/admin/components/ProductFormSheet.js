import { useState } from 'react';
import { PRODUCT_KIND, PRODUCT_KIND_LABELS } from '@/domain/menu';
import { getErrorMessage } from '@/shared/errors/messages';
import { parseColones } from '@/shared/utils/money';
import { Banner, ChipField, Sheet, TextField, Toggle } from '@/shared/ui';

import { DeleteSection } from './DeleteSection';

const KIND_OPTIONS = Object.values(PRODUCT_KIND).map((value) => ({ key: value, label: PRODUCT_KIND_LABELS[value] }));

/**
 * Crear o editar un platillo o bebida.
 *
 * @param {Object} props
 * @param {import('@/domain/menu/types').Menu} props.menu
 * @param {import('@/domain/menu/types').Product | null} props.product  null = nuevo
 * @param {string | null} [props.defaultCategoryId]
 * @param {boolean} props.busy
 * @param {unknown} props.error  último error de la acción (del servidor)
 * @param {(data: object) => Promise<{ ok: boolean }>} props.onSave
 * @param {() => Promise<{ ok: boolean }>} [props.onDelete]
 * @param {() => void} props.onClose
 */
export function ProductFormSheet({ menu, product, defaultCategoryId, busy, error, onSave, onDelete, onClose }) {
  const editing = Boolean(product);
  const [name, setName] = useState(product?.name ?? '');
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? defaultCategoryId ?? menu.categories[0]?.id ?? null);
  const [kind, setKind] = useState(product?.kind ?? PRODUCT_KIND.DISH);
  const [priceText, setPriceText] = useState(product ? String(product.price) : '');
  const [extraIds, setExtraIds] = useState(product?.extraIds ?? []);
  const [active, setActive] = useState(product?.active ?? true);
  const [localError, setLocalError] = useState(null);

  const toggleExtra = (id) =>
    setExtraIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));

  async function save() {
    const price = parseColones(priceText);
    if (!name.trim()) return setLocalError('Escribe el nombre.');
    if (!categoryId) return setLocalError('Elige una categoría.');
    if (price === null) return setLocalError('Escribe el precio en colones, solo números (ej. 3500).');

    setLocalError(null);
    const data = { categoryId, name, kind, price, extraIds };
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
      testID="product-form"
      title={editing ? 'Editar producto' : 'Nuevo producto'}
      onClose={onClose}
      primaryAction={{ icon: 'checkmark', label: busy ? 'Guardando…' : 'Guardar', onPress: save, disabled: busy }}
    >
      {message ? <Banner tone="error" message={message} /> : null}

      <TextField label="Nombre" value={name} onChangeText={setName} autoCapitalize="sentences" placeholder="Ej. Casado con pollo" />

      <ChipField label="Tipo" options={KIND_OPTIONS} isSelected={(value) => kind === value} onSelect={setKind} />

      <ChipField
        label="Categoría"
        options={menu.categories.map((category) => ({ key: category.id, label: category.active ? category.name : `${category.name} (oculta)` }))}
        isSelected={(id) => categoryId === id}
        onSelect={setCategoryId}
      />

      <TextField
        label="Precio (₡)"
        value={priceText}
        onChangeText={setPriceText}
        keyboardType="number-pad"
        placeholder="Ej. 3500"
      />

      <ChipField
        label="Extras que se pueden agregar"
        options={menu.extras.map((extra) => ({ key: extra.id, label: extra.active ? extra.name : `${extra.name} (oculto)` }))}
        isSelected={(id) => extraIds.includes(id)}
        onSelect={toggleExtra}
        hint={menu.extras.length === 0 ? 'Todavía no hay extras. Créalos en la pestaña “Extras”.' : undefined}
      />

      {editing ? (
        <>
          <Toggle label="Visible en caja" value={active} onValueChange={setActive} />
          <DeleteSection
            itemLabel="producto"
            note="Los pedidos ya tomados no cambian. Si solo quieres dejar de venderlo, mejor ocúltalo."
            busy={busy}
            onConfirm={remove}
          />
        </>
      ) : null}
    </Sheet>
  );
}
