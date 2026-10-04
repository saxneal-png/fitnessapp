/**
 * Utilidades de fecha y hora local para Chile / Dúo Fitness
 * Evita el desface de UTC a medianoche (cuando en Chile son las 21:00 y UTC ya es el día siguiente).
 */

export function getLocalDateString(d = new Date()) {
  const dateObj = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return dateStr;
}
