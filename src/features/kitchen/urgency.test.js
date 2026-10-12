import { KITCHEN_CONFIG } from './config';
import { getUrgency } from './urgency';

describe('getUrgency', () => {
  it('clasifica por tiempo transcurrido', () => {
    expect(getUrgency(0)).toBe('ok');
    expect(getUrgency(KITCHEN_CONFIG.warnAfterMs - 1)).toBe('ok');
    expect(getUrgency(KITCHEN_CONFIG.warnAfterMs)).toBe('warn');
    expect(getUrgency(KITCHEN_CONFIG.urgentAfterMs - 1)).toBe('warn');
    expect(getUrgency(KITCHEN_CONFIG.urgentAfterMs)).toBe('urgent');
  });

  it('un pedido sin enviar no tiene urgencia', () => {
    expect(getUrgency(null)).toBe('ok');
  });
});
