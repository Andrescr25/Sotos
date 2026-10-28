import { useState } from 'react';
import { View } from 'react-native';
import { PORTIONS_PER_UNIT_MAX, formatPortions } from '@/domain/inventory';
import { getErrorMessage } from '@/shared/errors/messages';
import { styles } from '@/shared/styles/components/inventory';
import { Banner, Button, Sheet, Stepper, Text } from '@/shared/ui';

/**
 * Receta de un platillo, bebida o extra: cuántas porciones de cada insumo
 * gasta UNA unidad vendida. Cada línea muestra la fracción que significa
 * ("1/8 de paquete") para que el administrador la revise de un vistazo.
 *
 * @param {Object} props
 * @param {string} props.title  nombre del producto o extra
 * @param {import('@/domain/inventory').InventoryItem[]} props.items  todos los insumos
 * @param {import('@/domain/inventory').RecipeLine[]} props.lines  receta actual
 * @param {boolean} props.busy
 * @param {unknown} props.error
 * @param {(lines: import('@/domain/inventory').RecipeLine[]) => Promise<{ ok: boolean }>} props.onSave
 * @param {() => void} props.onClose
 */
export function RecipeSheet({ title, items, lines, busy, error, onSave, onClose }) {
  const [portions, setPortions] = useState(() => Object.fromEntries(lines.map((line) => [line.itemId, line.portions])));

  async function save() {
    const next = items
      .filter((item) => (portions[item.id] ?? 0) > 0)
      .map((item) => ({ itemId: item.id, portions: portions[item.id] }));
    const result = await onSave(next);
    if (result.ok) onClose();
  }

  return (
    <Sheet
      visible
      testID="recipe-form"
      title={`Receta: ${title}`}
      onClose={onClose}
      footer={<Button icon="checkmark" label={busy ? 'Guardando…' : 'Guardar receta'} onPress={save} disabled={busy} />}
    >
      {error ? <Banner tone="error" message={getErrorMessage(error)} /> : null}
      <Text color="textSecondary">
        Elige cuántas porciones de cada insumo gasta una unidad vendida. Lo que dejes en 0 no se descuenta.
      </Text>

      {items.map((item) => {
        const value = portions[item.id] ?? 0;
        return (
          <View key={item.id} style={styles.recipeLine}>
            <View style={styles.recipeInfo}>
              <Text variant="bodyLarge" style={styles.title}>{item.name}</Text>
              <Text variant="caption" color={value > 0 ? 'primary' : 'textSecondary'}>
                {value > 0 ? `Usa ${formatPortions(value, item)}` : 'No se usa'}
              </Text>
            </View>
            <Stepper value={value} min={0} max={PORTIONS_PER_UNIT_MAX} onChange={(next) => setPortions((previous) => ({ ...previous, [item.id]: next }))} />
          </View>
        );
      })}
    </Sheet>
  );
}
