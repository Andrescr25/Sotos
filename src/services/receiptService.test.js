import { createDraftOrder, createOrderItem, addItem, setCustomerName, sendOrderToKitchen } from '@/domain/orders';
import { createReceiptService } from './receiptService';
import { buildOrderReceiptDocument } from './receipts/buildOrderReceiptDocument';

const cashier = { id: 'cashier-1', name: 'María', role: 'cashier' };
function sentOrder() {
  const product = { id: 'burger', name: 'Hamburguesa', price: 3500, kind: 'dish', active: true, extraIds: ['cheese'] };
  let order = createDraftOrder({ createdBy: cashier });
  order = addItem(order, createOrderItem({ product, quantity: 2, extras: [{ extra: { id: 'cheese', name: 'Queso', price: 500 }, quantity: 1 }], notes: ['Sin cebolla'] }));
  order = setCustomerName(order, 'Ana Mora');
  return sendOrderToKitchen(order, { number: 12, user: cashier, now: new Date('2026-10-14T00:30:00Z') });
}

describe('comprobantes del pedido', () => {
  it('usa los precios guardados, cantidades independientes de extras y fecha de Costa Rica', () => {
    const html = buildOrderReceiptDocument(sentOrder());
    expect(html).toContain('Pedido #012');
    expect(html).toContain('Ana Mora');
    expect(html).toContain('13/10/2026');
    expect(html).toContain('2 × Hamburguesa');
    expect(html).toContain('₡7.000');
    expect(html).toContain('+ 1 × Queso');
    expect(html).toContain('₡500');
    expect(html).toContain('₡7.500');
    expect(html).toContain('Sin cebolla');
    expect(html).toContain('No es una factura electrónica.');
    expect(html).not.toContain('Pagado');
    expect(html).not.toContain('IVA');
  });

  it('escapa nombres y observaciones para que no ejecuten HTML en el navegador', () => {
    const order = sentOrder();
    order.customerName = '<script>window.opener.location="evil"</script>';
    order.createdBy.name = 'Ana & "María"';
    order.items[0].name = '<img src=x onerror=alert(1)>';
    order.items[0].extras[0].name = '<iframe src="evil">';
    order.items[0].notes = ['<svg onload=alert(2)>'];
    order.note = '</main><script>alert(3)</script>';
    const html = buildOrderReceiptDocument(order);
    expect(html).not.toMatch(/<script|<iframe|<img|<svg/);
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Ana &amp; &quot;María&quot;');
    expect(html).toContain('&lt;svg onload=alert(2)&gt;');
  });

  it.each([58, 80])('genera el formato de %i mm sin modificar el pedido', (paperWidth) => {
    const order = sentOrder();
    const before = JSON.parse(JSON.stringify(order));
    expect(buildOrderReceiptDocument(order, { paperWidth })).toContain(`papel de ${paperWidth} mm`);
    expect(order).toEqual(before);
  });

  it('rechaza borradores y tamaños de papel fuera de las opciones permitidas', () => {
    expect(() => buildOrderReceiptDocument(createDraftOrder({ createdBy: cashier }))).toThrow(expect.objectContaining({ code: 'receipt_not_sent' }));
    expect(() => buildOrderReceiptDocument(sentOrder(), { paperWidth: '80; color:red' })).toThrow(expect.objectContaining({ code: 'receipt_invalid_paper' }));
  });

  it('permite reimprimir el mismo pedido sin modificarlo y conserva los errores del dispositivo', () => {
    const printer = { supported: true, printDocument: jest.fn(() => ({ status: 'dialog-opened' })) };
    const service = createReceiptService({ printer });
    const order = sentOrder();
    const before = JSON.parse(JSON.stringify(order));
    expect(service.printOrder(order)).toEqual({ status: 'dialog-opened' });
    service.printOrder(order);
    expect(printer.printDocument).toHaveBeenCalledTimes(2);
    expect(printer.printDocument.mock.calls[0][0]).toEqual(printer.printDocument.mock.calls[1][0]);
    expect(order).toEqual(before);
    printer.printDocument.mockImplementationOnce(() => { throw new Error('Printer unavailable'); });
    expect(() => service.printOrder(order)).toThrow('Printer unavailable');
    expect(order).toEqual(before);
  });
});
