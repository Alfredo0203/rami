import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';

const EL_SALVADOR_TZ = 'America/El_Salvador';

export const formatDateSV = (date, format = 'd MMM yyyy') => {
  if (!date) return '';
  return formatInTimeZone(new Date(date), EL_SALVADOR_TZ, format, { locale: es });
};

export const formatDateTimeSV = (date, format = 'd MMM yyyy HH:mm') => {
  if (!date) return '';
  return formatInTimeZone(new Date(date), EL_SALVADOR_TZ, format, { locale: es });
};