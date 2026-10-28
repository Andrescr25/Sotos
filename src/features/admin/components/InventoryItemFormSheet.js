import { useState } from 'react';
import { View } from 'react-native';
import { pluralizeUnit, toPortions } from '@/domain/inventory';
import { getErrorMessage } from '@/shared/errors/messages';
import { styles } from '@/shared/styles/components/inventory';
import { parseWholeNumber } from '@/shared/utils/numbers';
import { Banner, Button, Sheet, Text, TextField } from '@/shared/ui';
import { DeleteSection } from './DeleteSection';

const asText = (value) => (value === undefined || value === null ? '' : String(value));

/**
 * Crear o editar un insumo (paquete de papas, kg de queso, botella de salsa…).
 * El stock inicial se escribe en unidades completas y porciones sueltas; al
 * editar, el stock se cambia con "Ajustar stock".
 *
 * @param {Object} props
 * @param {import('@/domain/inventory').InventoryItem | null} props.item  null = nuevo
 * @param {boolean} props.busy
 * @param {unknown} props.error
 * @param {(data: object) => Promise<{ ok: boolean }>} props.onSave
 * @param {() => Promise<{ ok: boolean }>} [props.onDelete]
 * @param {() => void} props.onClose
 */
export function InventoryItemFormSheet({ item, busy, error, onSave, onDelete, onClose }) {
  const editing = Boolean(item);
  const [name, setName] = useState(item?.name ?? '');
  const [unit, setUnit] = useState(item?.unit ?? '');
  const [perUnitText, setPerUnitText] = useState(asText(item?.portionsPerUnit ?? 1));
  const [unitsText, setUnitsText] = useState('');
  const [looseText, setLooseText] = useState('');
  const [minText, setMinText] = useState(asText(item?.minPortions ?? 0));
  const [localError, setLocalError] = useState(null);

  const portionsPerUnit = parseWholeNumber(perUnitText);
  const changedPortions = editing && portionsPerUnit !== null && portionsPerUnit !== item.portionsPerUnit;

  async function save() {
    if (!name.trim()) return setLocalError('Escribe el nombre del insumo.');
    if (!unit.trim()) return setLocalError('Escribe la unidad: paquete, kg, botella…');
    if (portionsPerUnit === null || portionsPerUnit < 1) {
      return setLocalError('Las porciones por unidad deben ser un número entero de 1 en adelante.');
    }
    const minPortions = parseWholeNumber(minText === '' ? '0' : minText);
    if (minPortions === null) return setLocalError('El aviso de stock bajo debe ser un número entero de porciones (0 = sin aviso).');

    const data = { name, unit, portionsPerUnit, minPortions };
    if (!editing) {
      const units = parseWholeNumber(unitsText === '' ? '0' : unitsText);
      const loose = parseWholeNumber(looseText === '' ? '0' : looseText);
      if (units === null || loose === null) return setLocalError('El stock inicial debe ser un número entero.');
      data.stock = toPortions({ units, portions: loose }, portionsPerUnit);
    }

    setLocalError(null);
    const result = await onSave(data);
    if (result.ok) onClose();
  }

  async function remove() {
    const result = await onDelete();
    if (result.ok) onClose();
  }

  const message = localError ?? (error ? getErrorMessage(error) : null);
  const initial =
    !editing && portionsPerUnit
      ? toPortions({ units: parseWholeNumber(unitsText) ?? 0, portions: parseWholeNumber(looseText) ?? 0 }, portionsPerUnit)
      : null;

  return (
    <Sheet
      visible
      testID="inventory-item-form"
      title={editing ? 'Editar insumo' : 'Nuevo insumo'}
      onClose={onClose}
      footer={<Button icon="checkmark" label={busy ? 'Guardando…' : 'Guardar'} onPress={save} disabled={busy} />}
    >
      {message ? <Banner tone="error" message={message} /> : null}

      <TextField label="Nombre" value={name} onChangeText={setName} autoCapitalize="sentences" placeholder="Ej. Papas congeladas" />
      <TextField label="Unidad (cómo lo compras o lo cuentas)" value={unit} onChangeText={setUnit} placeholder="Ej. paquete, kg, botella" />

      <View style={styles.group}>
        <TextField
          label="¿Cuántas porciones rinde cada unidad?"
          value={perUnitText}
          onChangeText={setPerUnitText}
          keyboardType="number-pad"
          placeholder="Ej. 8"
        />
        <Text variant="caption" color="textSecondary">
          Si un paquete alcanza para 8 platillos, escribe 8: cada platillo rebajará 1/8 del paquete. Si se usa entero, escribe 1.
        </Text>
        {changedPortions ? (
          <Banner tone="warning" message="Cambiar las porciones por unidad redefine cada porción: el stock y las recetas siguen contando porciones. Revisa el stock con un conteo." />
        ) : null}
      </View>

      {!editing ? (
        <View style={styles.group}>
          <Text variant="label">Stock inicial</Text>
          <View style={styles.pair}>
            <TextField
              style={styles.pairField}
              label={unit.trim() ? `${pluralizeUnit(unit.trim(), 2)} completos` : 'Unidades completas'}
              value={unitsText}
              onChangeText={setUnitsText}
              keyboardType="number-pad"
              placeholder="0"
            />
            {portionsPerUnit && portionsPerUnit > 1 ? (
              <TextField style={styles.pairField} label="Porciones sueltas" value={looseText} onChangeText={setLooseText} keyboardType="number-pad" placeholder="0" />
            ) : null}
          </View>
          {initial !== null && portionsPerUnit > 1 ? (
            <Text variant="caption" color="textSecondary">{`En total: ${initial} ${initial === 1 ? 'porción' : 'porciones'}.`}</Text>
          ) : null}
        </View>
      ) : null}

      <TextField
        label="Avisar cuando queden menos de (porciones)"
        value={minText}
        onChangeText={setMinText}
        keyboardType="number-pad"
        placeholder="0 = sin aviso"
      />

      {editing ? (
        <DeleteSection
          itemLabel="insumo"
          note="Se quitará de todas las recetas que lo usan. Las ventas ya hechas no cambian."
          busy={busy}
          onConfirm={remove}
        />
      ) : null}
    </Sheet>
  );
}
