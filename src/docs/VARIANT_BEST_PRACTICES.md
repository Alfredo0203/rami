# Variantes de Producto — Best Practices & Recomendaciones

## 1. Estructuración de Datos

### ✅ DO: Nombres de Atributos Consistentes

```javascript
// BIEN — Nombres claros y consistentes
{
  "attributes": { "Color": "Rojo", "Talla": "XL" }
}

// BIEN — Translate-friendly
{
  "attributes": { "Size": "Large", "Color": "Blue" }
}
```

### ❌ DON'T: Nombres Inconsistentes

```javascript
// MAL — Talla vs Tamaño (¿cuál es?)
{ "attributes": { "Talla": "XL" } }
{ "attributes": { "Tamaño": "L" } }

// MAL — Mezcla de idiomas en el mismo producto
{ "attributes": { "Color": "Rojo", "Size": "XL" } }
```

**Recomendación**: Define un estándar por categoría.
- Ropa: `{ Color, Talla, Material, Fit }`
- Electrónica: `{ RAM, Almacenamiento, Color, Modelo }`
- Hogar: `{ Tamaño, Color, Material }`

---

## 2. Gestión de Stock

### ✅ DO: Stock por Variante

```javascript
// Cada combinación tiene stock independiente
ProductVariants: [
  { attributes: { Color: "Rojo", Talla: "M" }, stock: 15 },
  { attributes: { Color: "Rojo", Talla: "L" }, stock: 0 },  // Agotado
  { attributes: { Color: "Azul", Talla: "M" }, stock: 8 }
]
```

### ❌ DON'T: Stock Global Confuso

```javascript
// MAL — El usuario no sabe qué combinación tiene stock
Product: { stock: 100 }
ProductVariants: [
  { attributes: { Color: "Rojo", Talla: "M" } },  // ¿stock?
  { attributes: { Color: "Rojo", Talla: "L" } }
]
```

**Resultado esperado**: 
- UI muestra opciones "sin stock" tachadas
- No permites agregar combinaciones agotadas
- Flujo fluido incluso con stock mixto

---

## 3. Precios Dinámicos

### ✅ DO: Precio por Variante Cuando Difiera

```javascript
ProductVariants: [
  { attributes: { RAM: "8GB" }, price: 799.99 },
  { attributes: { RAM: "16GB" }, price: 999.99 },  // Más caro
  { attributes: { RAM: "32GB" }, price: 1299.99 }  // Aún más
]
```

**En UI**:
```
RAM: 8GB  → $799.99
RAM: 16GB → $999.99  ← Precio actualiza al seleccionar
RAM: 32GB → $1,299.99
```

### ❌ DON'T: Ignorar Diferenciales de Precio

```javascript
// MAL — Todo a $799, pero variante de 32GB debería ser $1,299
ProductVariants: [
  { attributes: { RAM: "8GB" }, price: 799.99 },
  { attributes: { RAM: "16GB" }, price: 799.99 },  // Incorrecto
  { attributes: { RAM: "32GB" }, price: 799.99 }   // Incorrecto
]
```

**Impacto**: Cliente compra sin saberlo RAM más cara de la que pagó.

---

## 4. Imágenes por Variante

### ✅ DO: Imagen Específica para Cambios Visuales

```javascript
ProductVariants: [
  { attributes: { Color: "Rojo" }, image_url: "rojo.jpg" },
  { attributes: { Color: "Azul" }, image_url: "azul.jpg" },
  { attributes: { Color: "Negro" }, image_url: "negro.jpg" }
]
```

**Ventajas**:
- Usuario ve el color exacto
- No hay confusión (ej: "¿es ese rojo oscuro o claro?")
- Tasa de devoluciones ↓

### ⚠️ OPTIONAL: Imagen para Cambios Structurales

```javascript
ProductVariants: [
  { attributes: { Tamaño: "Twin" }, image_url: "twin.jpg" },
  { attributes: { Tamaño: "Queen" }, image_url: "queen.jpg" }
]
```

### ❌ DON'T: Imagen Redundante

```javascript
// MAL — Todos iguales, no hay razón de cambiar
ProductVariants: [
  { attributes: { Color: "Rojo" }, image_url: "generic.jpg" },
  { attributes: { Color: "Azul" }, image_url: "generic.jpg" }
]
```

---

## 5. SKU y Tracking

### ✅ DO: SKU Descriptivo y Único

```javascript
ProductVariants: [
  {
    attributes: { Color: "Rojo", Talla: "M" },
    sku: "CAMISETA-001-ROJO-M"  // Única, descriptiva
  },
  {
    attributes: { Color: "Azul", Talla: "L" },
    sku: "CAMISETA-001-AZUL-L"
  }
]
```

**Ventajas**:
- Inventario: "Me falta CAMISETA-001-ROJO-M"
- Envíos: Etiqueta clara por variante
- Análisis: Sé qué combinaciones se venden

### ❌ DON'T: SKU Ambiguo

```javascript
// MAL — Imposible trackear
ProductVariants: [
  { attributes: { Color: "Rojo", Talla: "M" }, sku: "CAMISETA-1" },
  { attributes: { Color: "Azul", Talla: "L" }, sku: "CAMISETA-2" }
]

// ¿Cuál es cuál en 6 meses?
```

**Convención**: `[PRODUCTTYPE]-[PRODUCTID]-[ATTR1-VALUE1]-[ATTR2-VALUE2]`

---

## 6. Estados Activos/Inactivos

### ✅ DO: Desactivar Combinación sin Eliminar

```javascript
ProductVariants: [
  { attributes: { Color: "Rojo", Talla: "M" }, is_active: true, stock: 10 },
  { attributes: { Color: "Rojo", Talla: "L" }, is_active: false, stock: 5 }  // ← Desactivada
]
```

**Resultado en UI**:
- Talla L (Rojo) → No clickeable (cursor: not-allowed)
- No puede agregarse al carrito
- Datos históricos preservados para análisis

### ❌ DON'T: Eliminar Históricamente

```javascript
// MAL — Pierdes datos de ventas, órdenes, auditoría
// Nunca elimines variantes que se vendieron
ProductVariant.delete(variantId)  // ❌ No hagas esto
```

---

## 7. Completitud de Datos

### ✅ Campos Requeridos
```javascript
ProductVariant: {
  product_id: "required",      // ¿de qué producto?
  attributes: "required",      // ¿qué combinación?
  name: "required",            // Ej: "Rojo / XL"
  stock: "required"            // ¿cuántos hay?
}
```

### ✅ Campos Recomendados
```javascript
ProductVariant: {
  is_active: true,             // Controla disponibilidad
  sku: "PROD-001-COLOR-SIZE",  // Tracking
  sort_order: 0,               // Orden visual
  image_url: "..."             // Si hay cambio visual
}
```

### ✅ Campos Opcionales
```javascript
ProductVariant: {
  price: undefined,            // Hereda del producto
  original_price: undefined,   // Para descuentos
}
```

---

## 8. Cascada Inteligente

### ✅ DO: Validar Combinaciones Disponibles

```javascript
// Usuario selecciona Color = "Rojo"
// Sistema busca: ¿Existen tallas para Rojo con stock?
// Resultado:
//   Talla S (Rojo) → Sin stock → Deshabilitada
//   Talla M (Rojo) → Con stock → Habilitada ✓
//   Talla L (Rojo) → Con stock → Habilitada ✓

// Automáticamente salta a M (primera con stock)
```

### ❌ DON'T: Permitir Combinaciones Inválidas

```javascript
// MAL — Permite Color="Verde" + Talla="XXL" aunque no existe
// Usuario: "¿Por qué no está en carrito?"
// Tú: "Esa combinación no existe..."
// Usuario: 😠
```

---

## 9. Mobile Optimization

### ✅ DO: Atributos en Columna

```
┌─────────────────┐
│  COLOR          │
│ [Rojo] [Azul]   │
│ [Negro]         │
├─────────────────┤
│  TALLA          │
│ [S] [M] [L]     │
│ [XL]            │
├─────────────────┤
│ [Agregar]       │
└─────────────────┘
```

### ❌ DON'T: Grids Complejos

```
// MAL — Imposible en móvil
┌──────────────────────────────────┐
│ COLOR │ TALLA │ MATERIAL │ COLOR2│
├───────┼───────┼──────────┼───────┤
│ [R] [A] [N] │ [S][M][L] ...
```

**Regla**: 2 opciones máximo por fila en mobile.

---

## 10. Validación de Carrito

### ✅ DO: Validar Completitud

```javascript
// Antes de agregar
const isComplete = hasVariants
  ? selectedVariant !== null
  : true;  // Sin variantes, siempre válido

const canAddToCart = isComplete && inStock;

<Button disabled={!canAddToCart}>
  {!isComplete ? 'Selecciona variante' : 'Agregar al carrito'}
</Button>
```

### ❌ DON'T: Permitir Incompleto

```javascript
// MAL — Permite agregar sin seleccionar variante
// En carrito: { product: "Camiseta", variant: null, quantity: 1 }
// ¿Qué color? ¿Qué talla? 🤷
```

---

## 11. Localización y i18n

### ✅ DO: Traducir Nombres de Atributos

```javascript
// ES
{ "Color": "Rojo", "Talla": "XL" }

// EN
{ "Color": "Red", "Size": "XL" }

// PT
{ "Cor": "Vermelho", "Tamanho": "XL" }
```

### ✅ RECOMENDACIÓN: Usar Claves Neutras

```javascript
// En la BD: claves estándar
{ "color": "rojo", "size": "xl" }

// En la UI: traducidas según locale
t('variant.color') → "Color" (ES) / "Color" (EN)
```

---

## 12. Análisis y Reportes

### Métricas Útiles

```javascript
// ¿Qué combinaciones son populares?
SELECT attributes, SUM(quantity) as vendidas
FROM CartItems
JOIN ProductVariants ON ...
GROUP BY attributes
ORDER BY vendidas DESC

// ¿Cuáles están agotadas?
SELECT attributes, stock
FROM ProductVariants
WHERE stock = 0 AND is_active = true

// ¿Dónde hay rotación lenta?
SELECT attributes, stock, updated_date
FROM ProductVariants
WHERE stock > 50 AND is_active = true
ORDER BY updated_date ASC
```

---

## 13. Escalabilidad: Cuándo Refactorizar

### ⚠️ Señales de Que Necesitas Optimización

- [ ] **> 100 variantes por producto**: Considera agrupación o lazy-loading
- [ ] **> 5 dimensiones**: Revisa si todas son necesarias
- [ ] **Precios muy variables**: Valida lógica de cálculo
- [ ] **Stock frecuentemente incoherente**: Sistema de sincronización débil

### ✅ Soluciones Escalables

```javascript
// 1. Agrupación visual por categoría
const grouped = groupBy(variants, v => v.attributes.Color);
// Render: Tabs por color, dentro opciones de talla

// 2. Lazy-loading de variantes (si hay 500+)
const [loadedVariants, setLoadedVariants] = useState([]);
useEffect(() => {
  // Cargar solo las primeras 50, rest on demand
}, []);

// 3. Filtro pre-búsqueda
<input placeholder="Buscar color..." onChange={handleSearch} />
{filteredVariants.map(...)}
```

---

## 14. Seguridad y Validación

### ✅ DO: Validar en Backend

```javascript
// Antes de crear OrderItem, verifica:
const variant = await ProductVariant.get(variantId);
if (variant.stock < quantity) {
  throw new Error("Stock insuficiente");
}
if (variant.product_id !== cartItem.product_id) {
  throw new Error("Variante no pertenece a este producto");
}
```

### ❌ DON'T: Confiar en Frontend

```javascript
// MAL — Usuario manipula quantity en dev tools
// ¿Qué impide que agregue 1000 unidades sin stock?
addToCart({ variant, quantity: 9999 })  // ❌
```

---

## 15. Checklist Final Antes de Lanzar

- [ ] Estructura de datos validada (atributos consistentes)
- [ ] SKU único y descriptivo por variante
- [ ] Stock correcto por combinación
- [ ] Imágenes por variante (si aplica)
- [ ] Precios dinámicos validados
- [ ] Cascada inteligente funcionando
- [ ] UI responsive en mobile
- [ ] Validación en carrito completa
- [ ] Datos históricos preservados (no elimines variantes)
- [ ] Análisis/reportes disponibles
- [ ] Documentación actualizada
- [ ] Testing con >50 combinaciones
- [ ] Backend protegido contra manipulación

---

**Última actualización:** 2 de abril de 2026  
**Versión:** 1.0 — Escalable y Production-Ready