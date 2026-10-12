/**
 * Limitador simple en memoria: máximo `max` intentos por `windowMs` y clave.
 * Protege el inicio de sesión y las invitaciones de la fuerza bruta. Suficiente para
 * una sola instancia (ver límites en docs/DESPLIEGUE_RENDER.md).
 *
 * @param {{ max: number, windowMs: number, now?: () => number }} options
 */
export function createRateLimiter({ max, windowMs, now = () => Date.now() }) {
  const hits = new Map();

  return {
    /** @returns {boolean} true si el intento está permitido */
    allow(key) {
      const current = now();
      const recent = (hits.get(key) ?? []).filter((time) => current - time < windowMs);

      if (recent.length >= max) {
        hits.set(key, recent);
        return false;
      }
      recent.push(current);
      hits.set(key, recent);

      // Limpieza ocasional para que el mapa no crezca sin límite.
      if (hits.size > 5000) {
        hits.forEach((times, mapKey) => {
          if (times.every((time) => current - time >= windowMs)) hits.delete(mapKey);
        });
      }
      return true;
    },
  };
}
