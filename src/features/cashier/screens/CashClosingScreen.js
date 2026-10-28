import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { calculateCashDifference, calculateExpectedCash } from '@/domain/cashClosing';
import { PAYMENT_METHOD } from '@/domain/payments';
import { useAuth } from '@/features/auth';
import { WorkspaceScreen } from '@/features/workspace/components/WorkspaceScreen';
import { cashClosingService } from '@/services';
import { getErrorMessage } from '@/shared/errors/messages';
import { useResponsiveLayout } from '@/shared/hooks/useResponsiveLayout';
import { styles } from '@/shared/styles/screens/cashClosing';
import { formatColones, parseColones } from '@/shared/utils/money';
import { formatDateTime } from '@/shared/utils/time';
import { Banner, EmptyState, Spinner } from '@/shared/ui';
import { describeDifference } from '../cashDifference';
import { CashCountCard } from '../components/CashCountCard';
import { ClosingHistory } from '../components/ClosingHistory';
import { CloseRegisterSheet } from '../components/CloseRegisterSheet';
import { SalesBreakdown } from '../components/SalesBreakdown';
import { useCashClosing } from '../hooks/useCashClosing';

/**
 * Cierre de caja: junta lo cobrado desde el último cierre, cuadra el efectivo
 * contra lo que hay en el cajón y deja el cierre guardado.
 *
 * Al cerrar sesión la pantalla puede renderizarse un instante sin usuario
 * antes de que la ruta protegida la desmonte; por eso solo existe con usuario.
 */
export default function CashClosingScreen() {
  const { user } = useAuth();
  return user ? <CashClosingWorkspace /> : null;
}

function CashClosingWorkspace() {
  const router = useRouter();
  const { split: wide } = useResponsiveLayout();
  const { pending, closings, loading, error: loadError, reload } = useCashClosing();

  const [openingText, setOpeningText] = useState(null); // null = usar el fondo sugerido
  const [countedText, setCountedText] = useState('');
  const [note, setNote] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState(null);
  const [closed, setClosed] = useState(null);
  // Mientras se reintenta un cierre se conserva su identificador: si la
  // respuesta se perdió, repetirlo devuelve el cierre ya guardado.
  const attemptId = useRef(null);
  const closingRef = useRef(false);

  const effectiveOpening = openingText ?? String(pending?.suggestedOpeningFloat ?? 0);
  const openingFloat = parseColones(effectiveOpening);
  const countedCash = parseColones(countedText);
  const cashSales = pending?.sales.byMethod[PAYMENT_METHOD.CASH].total ?? 0;

  const cash = useMemo(() => {
    if (openingFloat === null) return { expected: null, difference: null };
    const expected = calculateExpectedCash(openingFloat, cashSales);
    return {
      expected,
      difference: countedCash === null ? null : calculateCashDifference(countedCash, expected),
    };
  }, [openingFloat, countedCash, cashSales]);

  const ready = Boolean(pending?.closable) && openingFloat !== null && countedCash !== null;
  const canClose = ready && !closing;

  async function confirmClose() {
    if (closingRef.current || !canClose) return;
    closingRef.current = true;
    setClosing(true);
    setCloseError(null);
    attemptId.current ??= cashClosingService.newClosingId();
    try {
      const result = await cashClosingService.close({
        id: attemptId.current,
        openingFloat,
        countedCash,
        note,
      });
      attemptId.current = null;
      setConfirmOpen(false);
      setClosed(result);
      setOpeningText(null);
      setCountedText('');
      setNote('');
      reload();
    } catch (caught) {
      setCloseError(getErrorMessage(caught));
      // Otro dispositivo pudo cerrar primero: se actualiza lo pendiente.
      if (caught?.code === 'cash_no_sales') {
        attemptId.current = null;
        reload();
      }
    } finally {
      closingRef.current = false;
      setClosing(false);
    }
  }

  const closedSummary = closed ? describeDifference(closed.cash.difference) : null;

  return (
    <WorkspaceScreen
      section="closing"
      title="Cierre de caja"
      subtitle="Cuenta el efectivo y deja el turno cuadrado."
      back={router.canGoBack()}
      scroll
    >
      {closed ? (
        <Banner
          tone="success"
          message={`Caja cerrada. Cierre #${closed.number}: ${formatColones(closed.sales.total)} en ventas, ${closedSummary.kind === 'exact' ? 'el efectivo cuadró' : `${closedSummary.caption.toLowerCase()} ${closedSummary.label}`}.`}
          style={styles.banner}
          onDismiss={() => setClosed(null)}
        />
      ) : null}
      {loadError ? <Banner tone="error" message={getErrorMessage(loadError)} style={styles.banner} /> : null}

      {loading ? (
        <Spinner message="Calculando la caja…" />
      ) : pending ? (
        <View style={styles.page}>
          {pending.closable ? (
            <View style={wide ? styles.columns : styles.columnsNarrow}>
              <View style={styles.column}>
                <SalesBreakdown sales={pending.sales} since={pending.since} />
              </View>
              <View style={styles.column}>
                <CashCountCard
                  cashSales={cashSales}
                  openingText={effectiveOpening}
                  countedText={countedText}
                  note={note}
                  expected={cash.expected}
                  difference={cash.difference}
                  onOpeningChange={setOpeningText}
                  onCountedChange={setCountedText}
                  onNoteChange={setNote}
                  canClose={canClose}
                  onClose={() => {
                    setCloseError(null);
                    setConfirmOpen(true);
                  }}
                />
              </View>
            </View>
          ) : (
            <EmptyState
              icon="wallet-outline"
              title="No hay ventas por cerrar"
              message={
                pending.lastClosing
                  ? `Último cierre: #${pending.lastClosing.number}, ${formatDateTime(pending.lastClosing.closedAt)}. Los pedidos que se cobren desde entonces aparecerán aquí.`
                  : 'Los pedidos que se cobren aparecerán aquí para cerrar la caja.'
              }
            />
          )}

          <ClosingHistory closings={closings} />
        </View>
      ) : null}

      {confirmOpen && ready ? (
        <CloseRegisterSheet
          sales={pending.sales}
          cash={{ expected: cash.expected, counted: countedCash, difference: cash.difference }}
          busy={closing}
          error={closeError}
          onConfirm={confirmClose}
          onClose={() => setConfirmOpen(false)}
        />
      ) : null}
    </WorkspaceScreen>
  );
}
