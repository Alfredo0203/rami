import { formatInTimeZone } from 'date-fns-tz';

const EL_SALVADOR_TZ = 'America/El_Salvador';

export const formatDateSV = (date, format = 'dd MMM yyyy') => {
  if (!date) return '';
  return formatInTimeZone(new Date(date), EL_SALVADOR_TZ, format);
};

export const formatDateTimeSV = (date, format = 'dd MMM yyyy HH:mm') => {
  if (!date) return '';
  return formatInTimeZone(new Date(date), EL_SALVADOR_TZ, format);
};