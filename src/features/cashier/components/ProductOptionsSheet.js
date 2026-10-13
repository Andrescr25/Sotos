import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { calculateItemTotal, createOrderItem } from '@/domain/orders';
import { styles } from '@/shared/styles/components/forms';
import { formatColones } from '@/shared/utils/money';
import { Button, Chip, Sheet, Stepper, Text, TextField } from '@/shared/ui';

/**
 * Opciones de un producto antes de agregarlo: cantidad, extras (cada extra con
 * su propia cantidad, nunca mayor a las unidades) y observaciones.
 *
 * @param {Object} props
 * @param {import('@/domain/menu/types').Product} props.product
 * @param {import('@/domain/menu/types').Extra[]} props.extras  extras disponibles para este producto
 * @param {string[]} props.quickNotes  observaciones frecuentes
 * @param {(item: import('@/domain/orders/orderItem').OrderItem) => void} props.onAdd
 * @param {() => void} props.onClose
 */
export function ProductOptionsSheet({ product, extras, quickNotes, onAdd, onClose }) {
  const [quantity, setQuantity] = useState(1);
  const [extraQuantities, setExtraQuantities] = useState({});
  const [quickSelected, setQuickSelected] = useState([]);
  const [custom, setCustom] = useState('');

  const item = useMemo(() => {
    const selections = extras
      .map((extra) => ({ extra, quantity: Math.min(extraQuantities[extra.id] ?? 0, quantity) }))
      .filter((selection) => selection.quantity > 0);
    return createOrderItem({
      product,
      quantity,
      extras: selections,
      notes: [...quickSelected, custom],
    });
  }, [product, extras, quantity, extraQuantities, quickSelected, custom]);

  const toggleQuick = (note) =>
    setQuickSelected((current) =>
      current.includes(note) ? current.filter((value) => value !== note) : [...current, note],
    );

  return (
    <Sheet
      visible
      title={product.name}
      onClose={onClose}
      footer={
        <Button
          icon="add-circle"
          label={`Agregar al pedido · ${formatColones(calculateItemTotal(item))}`}
          onPress={() => onAdd(item)}
        />
      }
    >
      <View style={styles.row}>
        <Text variant="bodyLarge">Cantidad</Text>
        <Stepper value={quantity} min={1} onChange={setQuantity} />
      </View>

      {extras.length > 0 ? (
        <View style={styles.section}>
          <Text variant="title">Extras</Text>
          {extras.map((extra) => {
            const value = Math.min(extraQuantities[extra.id] ?? 0, quantity);
            return (
              <View key={extra.id} style={styles.row}>
                <View style={styles.optionInfo}>
                  <Text variant="bodyLarge">{extra.name}</Text>
                  <Text color="textSecondary">+{formatColones(extra.price)} c/u</Text>
                </View>
                <Stepper
                  value={value}
                  min={0}
                  max={quantity}
                  onChange={(next) => setExtraQuantities((current) => ({ ...current, [extra.id]: next }))}
                />
              </View>
            );
          })}
          {quantity > 1 ? (
            <Text variant="caption" color="textSecondary">
              Cada extra se aplica a una unidad: con {quantity} unidades puedes poner hasta {quantity}.
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text variant="title">Observaciones</Text>
        <View style={styles.chips}>
          {quickNotes.map((note) => (
            <Chip key={note} label={note} selected={quickSelected.includes(note)} onPress={() => toggleQuick(note)} />
          ))}
        </View>
        <TextField
          placeholder="Otra observación (ej. 1 sin cebolla)"
          value={custom}
          onChangeText={setCustom}
          autoCapitalize="sentences"
        />
      </View>
    </Sheet>
  );
}
