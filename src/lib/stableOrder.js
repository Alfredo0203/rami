// Orden aleatorio estable: la misma lista se muestra en el mismo orden durante
// toda la sesión, para que al volver del detalle de un producto el usuario
// encuentre exactamente la misma lista en el mismo lugar.

const PREFIX = 'order-seed:';

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getSeed(key) {
  try {
    const stored = Number(sessionStorage.getItem(PREFIX + key));
    if (stored > 0) return stored;
    const seed = Math.floor(Math.random() * 2147483647) || 1;
    sessionStorage.setItem(PREFIX + key, String(seed));
    return seed;
  } catch {
    return 1;
  }
}

export function stableShuffle(items, key) {
  if (!Array.isArray(items) || items.length === 0) return items || [];
  const random = mulberry32(getSeed(key));
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}