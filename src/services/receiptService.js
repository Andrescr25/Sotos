import { browserPrinter } from '@/shared/printing/browserPrinter';
import { buildOrderReceiptDocument } from './receipts/buildOrderReceiptDocument';

/** Imprimir y reimprimir no escribe ni vuelve a enviar pedidos a cocina. */
export function createReceiptService({ printer = browserPrinter } = {}) {
  return {
    supported: printer.supported,
    printOrder(order, options) {
      return printer.printDocument(buildOrderReceiptDocument(order, options));
    },
  };
}

export const receiptService = createReceiptService();
