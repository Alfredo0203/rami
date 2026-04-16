export const formatDateSV = (date) => {
  if (!date) return '';

  const normalized = String(date).replace('T', ' ').replace('Z', '');
  const [datePart] = normalized.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);

  const dateObj = new Date(year, month - 1, day);

  return dateObj.toLocaleString('es-SV', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateTimeSV = (date) => {
  if (!date) return '';

  const normalized = String(date).replace('T', ' ').replace('Z', '');
  const [datePart, timePart = '00:00:00'] = normalized.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  const dateObj = new Date(year, month - 1, day, hour, minute);
  
  // Restar 6 horas
  dateObj.setHours(dateObj.getHours() - 6);

  return dateObj.toLocaleString('es-SV', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};