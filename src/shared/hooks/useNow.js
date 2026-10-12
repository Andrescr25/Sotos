import { useEffect, useState } from 'react';

/**
 * Hora actual que se refresca cada `intervalMs`. Sirve para contadores en
 * pantalla (tiempo transcurrido de un pedido) sin timers sueltos por componente.
 * @param {number} [intervalMs]
 * @returns {Date}
 */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
