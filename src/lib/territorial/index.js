/**
 * Territorial data index — scalable for multiple countries.
 * To add a new country: create lib/territorial/xx.js and import it here.
 */
import SV from './sv';

export const COUNTRIES = { SV };

/** Returns department names for a given country code */
export function getDepartments(countryCode) {
  return COUNTRIES[countryCode]?.departments ?? [];
}

/** Returns municipality names for a given country code + department name */
export function getMunicipalities(countryCode, departmentName) {
  const dept = getDepartments(countryCode).find(d => d.name === departmentName);
  return dept?.municipalities ?? [];
}

export default COUNTRIES;