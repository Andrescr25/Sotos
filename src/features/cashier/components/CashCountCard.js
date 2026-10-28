import { View } from 'react-native';
import { styles } from '@/shared/styles/screens/cashClosing';
import { formatColones } from '@/shared/utils/money';
import { Button, Text, TextField } from '@/shared/ui';
import { describeDifference } from '../cashDifference';

const DIFFERENCE_STYLES = {
  exact: styles.differenceExact,
  over: styles.differenceOver,
  short: styles.differenceShort,
};

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
    <View style={styles.card}>
      <Text variant="title">Cuadre del efectivo</Text>

      <TextField
        label="Fondo inicial (efectivo con el que abrió la caja)"
        value={openingText}
        onChangeText={onOpeningChange}
        keyboardType="numeric"
        placeholder="0"
        error={expected === null ? 'Escribe el fondo en colones (0 si no hubo)' : undefined}
      />

      <View style={styles.group}>
        <View style={styles.row}>
          <Text color="textSecondary">Cobrado en efectivo</Text>
          <Text variant="label">{formatColones(cashSales)}</Text>
        </View>
        <View style={styles.row}>
          <Text variant="bodyLarge">Efectivo esperado en caja</Text>
          <Text variant="title">{expected === null ? '—' : formatColones(expected)}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <TextField
        label="Efectivo contado en caja *"
        value={countedText}
        onChangeText={onCountedChange}
        keyboardType="numeric"
        placeholder="Cuenta billetes y monedas"
      />

      {summary ? (
        <View style={[styles.difference, DIFFERENCE_STYLES[summary.kind]]} accessibilityLiveRegion="polite">
          <Text variant="caption" color={summary.color}>{summary.caption}</Text>
          <Text variant="headline" color={summary.color}>{summary.label}</Text>
        </View>
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

      <Button icon="lock-closed-outline" label="Cerrar caja" onPress={onClose} disabled={!canClose} style={styles.confirm} />
    </View>
  );
}
