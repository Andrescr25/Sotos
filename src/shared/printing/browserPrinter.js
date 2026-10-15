import { AppError } from '@/shared/errors/AppError';

/** Esta integración usa el servicio de impresión del navegador de la tablet. */
export const browserPrinter = {
  supported: false,
  printDocument() {
    throw new AppError('print_unsupported', 'Receipt printing is available in the browser');
  },
};
