const EL_SALVADOR_TZ = 'America/El_Salvador';

export const formatDateSV = (date) => {
  if (!date) return '';
  const dateObj = new Date(date);
  return dateObj.toLocaleString('es-SV', {
    timeZone: EL_SALVADOR_TZ,
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateTimeSV = (date) => {
  if (!date) return '';
  const dateObj = new Date(date);
  return dateObj.toLocaleString('es-SV', {
    timeZone: EL_SALVADOR_TZ,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};