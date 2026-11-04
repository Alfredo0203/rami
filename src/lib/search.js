// Búsqueda tolerante para la tienda: ignora tildes, mayúsculas y errores de
// escritura comunes ("pantalon" encuentra "Pantalón", "camista" encuentra "Camiseta").

const COMBINING_MARKS = /[\u0300-\u036f]/g;

// Quita solo las tildes/diacríticos sin cambiar el largo del texto,
// para poder resaltar coincidencias en el texto original.
export function stripAccents(value) {
  return String(value ?? '').normalize('NFD').replace(COMBINING_MARKS, '');
}

export function normalizeText(value) {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tolerance(token) {
  if (token.length >= 7) return 2;
  if (token.length >= 4) return 1;
  return 0;
}

function editDistance(a, b, max) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1;
    const swap = prev;
    prev = curr;
    curr = swap;
  }
  return prev[b.length];
}

function tokenMatches(textToken, queryToken) {
  if (textToken.includes(queryToken)) return true;

  const tol = tolerance(queryToken);
  if (tol === 0) return false;

  // Prefijo con tolerancia: "pantlon" → "pantalon"
  if (editDistance(textToken.slice(0, queryToken.length + tol), queryToken, tol) <= tol) return true;

  // Plurales y variantes: "pantalones" → "pantalon"
  return editDistance(textToken, queryToken, tol) <= tol;
}

// 0 = no coincide. Mayor puntaje = mejor coincidencia.
export function scoreText(text, query) {
  const t = normalizeText(text);
  const q = normalizeText(query);
  if (!t || !q) return 0;

  if (t === q) return 5;
  if (t.startsWith(q)) return 4;
  if (t.includes(q)) return 3;

  const queryTokens = q.split(' ');
  const textTokens = t.split(' ');
  const allTokensMatch = queryTokens.every((qt) => textTokens.some((tt) => tokenMatches(tt, qt)));
  if (allTokensMatch) return 2;

  return 0;
}

// Puntaje de un producto considerando los campos que el cliente puede escribir.
export function productMatchScore(product, query) {
  if (!product) return 0;
  const fields = [
    product.name,
    product.brand,
    product.description,
    product.category_name,
    ...(Array.isArray(product.tags) ? product.tags : []),
  ];
  return fields.reduce((best, field) => Math.max(best, scoreText(field, query)), 0);
}

// Índice de la coincidencia dentro del texto original (sin importar tildes).
export function findAccentInsensitiveIndex(text, query) {
  const plainText = String(text ?? '');
  const plainQuery = String(query ?? '');
  if (!plainQuery) return -1;

  const direct = plainText.toLowerCase().indexOf(plainQuery.toLowerCase());
  if (direct !== -1) return direct;

  const normalizedText = stripAccents(plainText).toLowerCase();
  const normalizedQuery = stripAccents(plainQuery).toLowerCase();
  if (normalizedText.length !== plainText.length) return -1;

  return normalizedText.indexOf(normalizedQuery);
}