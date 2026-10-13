import { useState } from 'react';
import { View } from 'react-native';
import { PRODUCT_KIND, PRODUCT_KIND_LABELS } from '@/domain/menu';
import { getErrorMessage } from '@/shared/errors/messages';
import { commonStyles as styles } from '@/shared/styles/commonStyles';
import { parseColones } from '@/shared/utils/money';
import { Banner, Button, Chip, Sheet, Text, TextField, Toggle } from '@/shared/ui';
import { DeleteSection } from './DeleteSection';

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
      footer={<Button icon="checkmark" label={busy ? 'Guardando…' : 'Guardar'} onPress={save} disabled={busy} />}
    >
      {message ? <Banner tone="error" message={message} /> : null}

      <TextField label="Nombre" value={name} onChangeText={setName} autoCapitalize="sentences" placeholder="Ej. Casado con pollo" />

      <View style={styles.group}>
        <Text variant="label" color="textSecondary">Tipo</Text>
        <View style={styles.chips}>
          {Object.values(PRODUCT_KIND).map((value) => (
            <Chip key={value} label={PRODUCT_KIND_LABELS[value]} selected={kind === value} onPress={() => setKind(value)} />
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <Text variant="label" color="textSecondary">Categoría</Text>
        <View style={styles.chips}>
          {menu.categories.map((category) => (
            <Chip
              key={category.id}
              label={category.active ? category.name : `${category.name} (oculta)`}
              selected={categoryId === category.id}
              onPress={() => setCategoryId(category.id)}
            />
          ))}
        </View>
      </View>

      <TextField
        label="Precio (₡)"
        value={priceText}
        onChangeText={setPriceText}
        keyboardType="number-pad"
        placeholder="Ej. 3500"
      />

      <View style={styles.group}>
        <Text variant="label" color="textSecondary">Extras que se pueden agregar</Text>
        {menu.extras.length === 0 ? (
          <Text color="textSecondary">Todavía no hay extras. Créalos en la pestaña “Extras”.</Text>
        ) : (
          <View style={styles.chips}>
            {menu.extras.map((extra) => (
              <Chip
                key={extra.id}
                label={extra.active ? extra.name : `${extra.name} (oculto)`}
                selected={extraIds.includes(extra.id)}
                onPress={() => toggleExtra(extra.id)}
              />
            ))}
          </View>
        )}
      </View>

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
