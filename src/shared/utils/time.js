const pad = (n) => String(n).padStart(2, '0');

/**
 * Día de negocio como "YYYY-MM-DD". Con `timeZone` (p. ej. "America/Costa_Rica")
 * usa esa zona; sin ella, la zona del dispositivo. Define cuándo se reinicia
 * la numeración de pedidos.
 * @param {Date} date
 * @param {string} [timeZone]
 * @returns {string}
 */
export function getBusinessDay(date, timeZone) {
  if (timeZone) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Hora en formato de 12 horas: "12:35 PM".
 * @param {string | Date} value fecha ISO o Date
 * @returns {string}
 */
export function formatClockTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  const hours = date.getHours();
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hours12}:${pad(date.getMinutes())} ${period}`;
}

/**
 * Tiempo transcurrido: 65_000 -> "01:05", 3_725_000 -> "1:02:05".
 * @param {number} ms
 * @returns {string}
 */
export function formatElapsed(ms) {
  const totalSeconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}
