import { ORDER_STATUS, calculateItemTotal, formatOrderNumber, getStatusTime } from '@/domain/orders';
import { AppError } from '@/shared/errors/AppError';
import { PAYMENT_METHOD, PAYMENT_METHOD_LABELS } from '@/domain/payments';
import { receiptStyles } from '@/shared/styles/print/receipt';
import { theme } from '@/shared/theme';
import { formatColones } from '@/shared/utils/money';
import { RESTAURANT_TIME_ZONE } from '@/shared/utils/time';

/** Todo dato del pedido se escapa antes de incluirlo en el documento HTML. */
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

export function buildOrderReceiptDocument(order, { paperWidth = theme.printing.defaultPaperWidth } = {}) {
  const sentAt = getStatusTime(order, ORDER_STATUS.NEW);
  if (!sentAt || (!Number.isInteger(order.number) || order.number < 1) || order.status === ORDER_STATUS.DRAFT) {
    throw new AppError('receipt_not_sent', 'Only a saved, sent order can be printed');
  }
  if (!theme.printing.paperWidths.includes(paperWidth)) {
    throw new AppError('receipt_invalid_paper', 'Unsupported receipt paper width');
  }
  const number = formatOrderNumber(order.number);
  const date = new Intl.DateTimeFormat('es-CR', {
    timeZone: RESTAURANT_TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(new Date(sentAt));
  const money = (amount) => escapeHtml(formatColones(amount));
  const lines = order.items.map((item) => `
    <section class="line">
      <div class="amount"><span><strong>${escapeHtml(item.quantity)} × ${escapeHtml(item.name)}</strong></span><span>${money(item.unitPrice * item.quantity)}</span></div>
      <p class="small">${escapeHtml(item.quantity)} × ${money(item.unitPrice)} c/u</p>
      ${item.extras.map((extra) => `<div class="amount small detail"><span>+ ${escapeHtml(extra.quantity)} × ${escapeHtml(extra.name)}</span><span>${money(extra.unitPrice * extra.quantity)}</span></div>`).join('')}
      ${item.notes.map((note) => `<p class="small detail">• ${escapeHtml(note)}</p>`).join('')}
      <div class="amount small"><span>Total de línea</span><span>${money(calculateItemTotal(item))}</span></div>
    </section>`).join('');

  const { payment } = order;
  const paymentBlock = payment
    ? `<section class="payment">
      <div class="amount"><span>Pago</span><span>${escapeHtml(PAYMENT_METHOD_LABELS[payment.method] ?? '')}</span></div>
      ${payment.method === PAYMENT_METHOD.CASH
        ? `<div class="amount"><span>Recibido</span><span>${money(payment.tendered)}</span></div>
      <div class="amount"><span><strong>Vuelto</strong></span><span><strong>${money(payment.change)}</strong></span></div>`
        : ''}
    </section>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="referrer" content="no-referrer" />
  <title>Soto's · Pedido ${escapeHtml(number)}</title>
  <style>${receiptStyles(paperWidth)}</style>
</head>
<body>
  <aside class="toolbar" aria-label="Opciones de impresión">
    <button type="button" id="print-document">Imprimir comprobante</button>
    <p>Selecciona tu impresora y papel de ${paperWidth} mm. También puedes guardar como PDF.</p>
    <p>En Chrome para Android: menú ⋮ → Compartir → Imprimir, si el cuadro de impresión no se abre.</p>
    <p>Al terminar, cierra esta pestaña para volver a Caja.</p>
  </aside>
  <main class="receipt">
    <header><h1>Soto's</h1><p>El todo a mil de los ticos</p><h2>Pedido ${escapeHtml(number)}</h2><p>Comprobante del pedido</p></header>
    <section class="meta"><p>${escapeHtml(date)}</p><p><strong>Cliente: ${escapeHtml(order.customerName)}</strong></p><p>Atendió: ${escapeHtml(order.createdBy.name)}</p></section>
    ${lines}
    ${order.note ? `<p class="note"><strong>Observación:</strong> ${escapeHtml(order.note)}</p>` : ''}
    <div class="total"><span>Total</span><strong>${money(order.totals.total)}</strong></div>
    ${paymentBlock}
    <p class="small">${escapeHtml(order.totals.itemCount)} unidades · Moneda: CRC</p>
    <footer><p>¡Gracias por tu visita!</p><p class="small">Comprobante del pedido.<br />No es una factura electrónica.</p></footer>
  </main>
</body>
</html>`;
}
