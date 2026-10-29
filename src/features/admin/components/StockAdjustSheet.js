import { useState } from 'react';
import { View } from 'react-native';
import { describeStock, toPortions } from '@/domain/inventory';
import { getErrorMessage } from '@/shared/errors/messages';
import { styles } from '@/shared/styles/components/inventory';
import { parseWholeNumber } from '@/shared/utils/numbers';
import { Banner, ChipField, Sheet, Text, TextField } from '@/shared/ui';

const MODES = [
  { key: 'in', label: 'Entró mercadería', icon: 'add-circle-outline' },
  { key: 'out', label: 'Merma o salida', icon: 'remove-circle-outline' },
  { key: 'count', label: 'Conteo físico', icon: 'clipboard-outline' },
];

const HINTS = {
  in: 'Suma lo que compraste o recibiste.',
  out: 'Resta lo que se dañó, se perdió o se usó fuera de las ventas.',
  count: 'Fija el stock a lo que contaste en la bodega, sin importar lo que decía el sistema.',
};

/**
 * Ajustar el stock de un insumo: entró mercadería, merma o conteo físico. La
 * cantidad se escribe en unidades completas y porciones sueltas, y se ve cómo
 * quedará antes de guardar.
 *
 * @param {Object} props
 * @param {import('@/domain/inventory').InventoryItem} props.item
 * @param {boolean} props.busy
 * @param {unknown} props.error
 * @param {(adjustment: { mode: 'add' | 'set', portions: number }) => Promise<{ ok: boolean }>} props.onSave
 * @param {() => void} props.onClose
 */
export function StockAdjustSheet({ item, busy, error, onSave, onClose }) {
  const [mode, setMode] = useState('in');
  const [unitsText, setUnitsText] = useState('');
  const [looseText, setLooseText] = useState('');
  const [localError, setLocalError] = useState(null);

  const units = parseWholeNumber(unitsText === '' ? '0' : unitsText);
  const loose = parseWholeNumber(looseText === '' ? '0' : looseText);
  const valid = units !== null && loose !== null;
  const amount = valid ? toPortions({ units, portions: loose }, item.portionsPerUnit) : null;

  const nextStock = amount === null ? null : mode === 'count' ? amount : item.stock + (mode === 'in' ? amount : -amount);
  const canSave = !busy && amount !== null && (mode === 'count' || amount > 0);

  async function save() {
    if (!canSave) return setLocalError('Escribe la cantidad con números enteros.');
    setLocalError(null);
    const adjustment = mode === 'count' ? { mode: 'set', portions: amount } : { mode: 'add', portions: mode === 'in' ? amount : -amount };
    const result = await onSave(adjustment);
    if (result.ok) onClose();
  }

  const message = localError ?? (error ? getErrorMessage(error) : null);

  return (
    <Sheet
      visible
      testID="stock-adjust-form"
      title={`Ajustar ${item.name}`}
      onClose={onClose}
      primaryAction={{ icon: 'checkmark', label: busy ? 'Guardando…' : 'Guardar ajuste', onPress: save, disabled: !canSave }}
    >
      {message ? <Banner tone="error" message={message} /> : null}

      <ChipField options={MODES} isSelected={(key) => mode === key} onSelect={setMode} hint={HINTS[mode]} />

      <View style={styles.pair}>
        <TextField
          style={styles.pairField}
          label={`Cantidad (${item.unit})`}
          value={unitsText}
          onChangeText={setUnitsText}
          keyboardType="number-pad"
          placeholder="0"
        />
        {item.portionsPerUnit > 1 ? (
          <TextField style={styles.pairField} label="Porciones sueltas" value={looseText} onChangeText={setLooseText} keyboardType="number-pad" placeholder="0" />
        ) : null}
      </View>

      <View style={styles.preview}>
        <Text color="textSecondary">{`Ahora: ${describeStock(item)} (${item.stock} porciones)`}</Text>
        {nextStock !== null ? (
          <Text variant="title">{`Quedará: ${describeStock({ ...item, stock: nextStock })} (${nextStock} porciones)`}</Text>
        ) : null}
      </View>
    </Sheet>
  );
}
