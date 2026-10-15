import { AppError } from '@/shared/errors/AppError';

/**
 * Pestaña independiente para que Chrome Android imprima solo el ticket.
 * Se abre desde el toque del usuario, sin esperar llamadas de red.
 */
export function createBrowserPrinter({ getWindow = () => window } = {}) {
  return {
    supported: true,
    printDocument(html) {
      const browser = getWindow();
      const preview = browser.open('', '_blank');
      if (!preview) throw new AppError('print_popup_blocked', 'The browser blocked the receipt preview');
      try {
        preview.opener = null;
        preview.document.open();
        preview.document.write(html);
        preview.document.close();
        const print = () => {
          preview.focus();
          preview.print();
        };
        preview.document.getElementById('print-document').addEventListener('click', print);
        print();
        // Abrir el diálogo no confirma que haya papel, conexión o una impresión física.
        return { status: 'dialog-opened' };
      } catch {
        // Se conserva la vista previa: Android también permite Menú → Compartir → Imprimir.
        throw new AppError('print_failed', 'Could not open the browser print dialog');
      }
    },
  };
}

export const browserPrinter = createBrowserPrinter();
