import { View } from 'react-native';
import { commonStyles } from '@/shared/styles/commonStyles';
import { formatColones } from '@/shared/utils/money';
import { Button, Callout, DataRow, Text, TextField } from '@/shared/ui';
import { describeDifference } from '../cashDifference';

/**
 * Cuadre del efectivo: el fondo con el que abrió la caja, lo cobrado en
 * efectivo y lo que se contó en el cajón.
 *
 * @param {Object} props
 * @param {number} props.cashSales  cobrado en efectivo
 * @param {string} props.openingText
 * @param {string} props.countedText
 * @param {string} props.note
 * @param {number | null} props.expected  null si el fondo no es válido
 * @param {number | null} props.difference  null mientras falte lo contado
 * @param {(text: string) => void} props.onOpeningChange
 * @param {(text: string) => void} props.onCountedChange
 * @param {(text: string) => void} props.onNoteChange
 * @param {boolean} props.canClose
 * @param {() => void} props.onClose
 */
export function CashCountCard({
  cashSales,
  openingText,
  countedText,
  note,
  expected,
  difference,
  onOpeningChange,
  onCountedChange,
  onNoteChange,
  canClose,
  onClose,
}) {
  const summary = difference === null ? null : describeDifference(difference);

  return (
    <View style={commonStyles.panel}>
      <Text variant="title">Cuadre del efectivo</Text>

      <TextField
        label="Fondo inicial (efectivo con el que abrió la caja)"
        value={openingText}
        onChangeText={onOpeningChange}
        keyboardType="numeric"
        placeholder="0"
        error={expected === null ? 'Escribe el fondo en colones (0 si no hubo)' : undefined}
      />

      <View style={commonStyles.group}>
        <DataRow label="Cobrado en efectivo" value={formatColones(cashSales)} />
        <DataRow strong label="Efectivo esperado en caja" value={expected === null ? '—' : formatColones(expected)} />
      </View>

      <View style={commonStyles.divider} />

      <TextField
        label="Efectivo contado en caja *"
        value={countedText}
        onChangeText={onCountedChange}
        keyboardType="numeric"
        placeholder="Cuenta billetes y monedas"
      />

      {summary ? (
        <Callout live tone={summary.color} caption={summary.caption} value={summary.label} />
      ) : (
        <Text variant="caption" color="textSecondary">Escribe lo que contaste para ver si la caja cuadra.</Text>
      )}

      <TextField
        placeholder="Observaciones (opcional)"
        value={note}
        onChangeText={onNoteChange}
        autoCapitalize="sentences"
        maxLength={200}
      />

      <Button icon="lock-closed-outline" label="Cerrar caja" onPress={onClose} disabled={!canClose} />
    </View>
  );
}
