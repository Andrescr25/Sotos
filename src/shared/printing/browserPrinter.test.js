import { createBrowserPrinter } from './browserPrinter.web';

function environment() {
  const button = { addEventListener: jest.fn() };
  const preview = {
    opener: {}, focus: jest.fn(), print: jest.fn(),
    document: { open: jest.fn(), write: jest.fn(), close: jest.fn(), getElementById: jest.fn(() => button) },
  };
  const browser = { open: jest.fn(() => preview) };
  return { button, preview, browser, printer: createBrowserPrinter({ getWindow: () => browser }) };
}

describe('impresión del navegador', () => {
  it('abre la vista desde el toque y permite imprimir otra vez sin cerrar la pestaña', () => {
    const { button, preview, browser, printer } = environment();
    expect(printer.printDocument('<html>Ticket</html>')).toEqual({ status: 'dialog-opened' });
    expect(browser.open).toHaveBeenCalledWith('', '_blank');
    expect(preview.opener).toBeNull();
    expect(preview.document.write).toHaveBeenCalledWith('<html>Ticket</html>');
    expect(preview.print).toHaveBeenCalledTimes(1);
    const [event, reprint] = button.addEventListener.mock.calls[0];
    expect(event).toBe('click');
    reprint();
    expect(preview.print).toHaveBeenCalledTimes(2);
    expect(browser.open).toHaveBeenCalledTimes(1);
  });

  it('identifica el bloqueo de ventanas emergentes para poder reintentar', () => {
    const printer = createBrowserPrinter({ getWindow: () => ({ open: () => null }) });
    expect(() => printer.printDocument('Ticket')).toThrow(expect.objectContaining({ code: 'print_popup_blocked' }));
  });

  it('reporta problemas del diálogo sin confundirlos con un envío fallido a cocina', () => {
    const { printer, preview } = environment();
    preview.print.mockImplementation(() => { throw new Error('Unavailable'); });
    expect(() => printer.printDocument('Ticket')).toThrow(expect.objectContaining({ code: 'print_failed' }));
    expect(preview.document.close).toHaveBeenCalled();
  });
});
