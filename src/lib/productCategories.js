// Categorías de un producto.
// Un producto puede estar en varias categorías: se guardan en category_ids y la
// primera es la principal (category_id), que se mantiene por compatibilidad.

export function getProductCategoryIds(product) {
  const ids = Array.isArray(product?.category_ids)
    ? product.category_ids.filter(Boolean)
    : [];
  if (ids.length) return ids;
  return product?.category_id ? [product.category_id] : [];
}

export function productMatchesCategory(product, categoryId) {
  if (!categoryId || categoryId === 'all') return true;
  return getProductCategoryIds(product).includes(categoryId);
}