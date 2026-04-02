# Arquitectura de Variantes de Producto — Tipo Temu

## Resumen Ejecutivo

El sistema de variantes está diseñado para ser **totalmente agnóstico del tipo de producto**. Funciona igual para ropa, electrónicos, belleza, hogar, etc., sin necesidad de cambiar código.

- **Estructura de datos**: Flexible, basada en pares clave-valor
- **Lógica de UI**: Automática, detecta atributos dinámicamente
- **Validación**: Cascada inteligente de combinaciones disponibles
- **Experiencia**: Moderna, visual, tipo Temu/Shein

---

## 1. Estructura de Datos

### Tabla `Product`

```json
{
  "id": "prod_001",
  "name": "Camiseta Classic",
  "price": 29.99,
  "original_price": 49.99,
  "category_id": "cat_001",
  "brand": "Brand X",
  "images": ["url1", "url2"],
  "stock": 100,            // Stock base (si NO tiene variantes)
  "has_variants": true,    // Flag para indicar que usa ProductVariant
  "is_active": true,
  "tags": ["ropa", "verano"],
  "specifications": {
    "Material": "Algodón 100%",
    "Cuidados": "Lavar a 30°C"
  }
}
```

**Decisiones de diseño:**
- `has_variants: true` → Busca en `ProductVariant`
- `has_variants: false` → Usa `stock` y `price` base
- `specifications` es para datos NO seleccionables por el usuario

### Tabla `ProductVariant`

Cada variante representa **una combinación específica** de atributos.

```json
{
  "id": "var_001",
  "product_id": "prod_001",
  "name": "Rojo / XL",                 // Label para admins
  "attributes": {
    "Color": "Rojo",
    "Talla": "XL",
    "Material": "Algodón"              // Puede incluir specs
  },
  "price": 29.99,                      // Precio de esta combinación
  "original_price": 49.99,
  "stock": 15,                         // Stock de esta combinación
  "sku": "CAMISETA-001-ROJO-XL",
  "image_url": "url-rojo.jpg",         // Imagen específica (opcional)
  "is_active": true,
  "sort_order": 0
}
```

**Clave: `attributes` es un objeto flexible**
- Soporta **N dimensiones**: `{ Color: "...", Talla: "...", Material: "..." }`
- Cada combinación es una fila independiente
- No hay límite de atributos por producto

### Ejemplos por Tipo de Producto

#### 🧥 Ropa (Camiseta)
```json
{
  "attributes": { "Color": "Rojo", "Talla": "XL", "Fit": "Regular" }
}
```

#### 👟 Zapatos
```json
{
  "attributes": { "Color": "Negro", "Talla": "42", "Estilo": "Casual" }
}
```

#### 💻 Electrónica (Laptop)
```json
{
  "attributes": { "Modelo": "Pro 15", "RAM": "16GB", "Almacenamiento": "512GB", "Color": "Plata" }
}
```

#### 🏠 Hogar (Sábanas)
```json
{
  "attributes": { "Tamaño": "Queen", "Color": "Azul", "Material": "Algodón 100%" }
}
```

#### 💄 Belleza (Perfume)
```json
{
  "attributes": { "Aroma": "Floral", "Volumen": "100ml", "Tipo": "EDP" }
}
```

#### 📦 Combo/Paquete
```json
{
  "attributes": { "Cantidad": "3 unidades", "Sabor": "Fresa", "Presentación": "Caja" }
}
```

---

## 2. Lógica de Selección (Cascada Inteligente)

### Flujo en `VariantSelector.jsx`

#### Paso 1: Extraer Atributos
```javascript
const attrKeys = ['Color', 'Talla', 'Material']; // Dinámico
```

#### Paso 2: Para Cada Atributo, Obtener Valores Únicos
```javascript
// Color → ["Rojo", "Azul", "Negro"]
// Talla → ["S", "M", "L", "XL"]
// Material → ["Algodón", "Poliéster"]
```

#### Paso 3: Validación de Disponibilidad

**`isValueAvailable(attrKey, attrValue)`**
- Combinan la selección actual + el nuevo valor
- Buscan variantes que coincidan con esa combinación
- Retornan `true` si existe al menos una variante con stock

Ejemplo:
```javascript
// Usuario selecciona Color = "Rojo"
// Pregunta: ¿Existen tallas para "Rojo" con stock?
// Sistema busca: todas las variantes donde Color="Rojo" AND stock > 0
// → Si sí: habilita ese color
// → Si no: deshabilita ese color (lo muestra atenuado)
```

#### Paso 4: Cascada al Cambiar Atributo

**`handleSelect(attrKey, attrValue)`**
- Usuario hace clic en un color
- Sistema busca la mejor variante que tenga ese color + otros atributos ya seleccionados
- Prioridad:
  1. Combinación exacta (todos los atributos) con stock
  2. Combinación parcial (el atributo nuevo + otros seleccionados) con stock
  3. Cualquier variante con ese atributo (aunque sin stock)

```javascript
// Escenario: Usuario selecciona Color="Rojo"
// Estado actual: { Talla: "XL", Material: "Algodón" }
// Deseo: { Color: "Rojo", Talla: "XL", Material: "Algodón" }

// 1. ¿Existe Rojo/XL/Algodón con stock?
//    Sí → Selecciona eso ✓
// 
// 2. ¿Existe Rojo + algún combo parcial con stock?
//    Sí → Selecciona el más próximo ✓
//
// 3. ¿Existe Rojo al menos?
//    Sí → Selecciona y muestra "sin stock en esta combinación" ✓
```

---

## 3. Componentes Visuales

### `VariantSelector` (Padre)
- Itera cada `attrKey`
- Decide si usar Swatch o Chip según el atributo
- Maneja la cascada lógica

### `SwatchButton` (para Color, Estilo, Modelo)
```
┌─────────────┐
│  [Imagen]   │
│  Rojo (🔴)  │  ← Mostrado con foto/color
│  [✓ badge]  │
└─────────────┘
```

**Cuándo usarlo:**
- Atributo contiene "color" en el nombre
- O la variante tiene `image_url`

### `ChipButton` (para Talla, Capacidad, Material)
```
┌──────────────┐
│  XL          │  ← Chip simple de texto
│  [✓ badge]   │
└──────────────┘
```

**Cuándo usarlo:**
- Atributo sin imagen
- Valores discretos (tallas, capacidades, tipos)

### Estados Visuales
```
Disponible + No seleccionado:
  border: gris, hover: azul claro, cursor: pointer

Disponible + Seleccionado:
  border: azul (primary), bg: azul (para chips), shadow: sutil, ✓ badge

No disponible (sin stock):
  opacity: 50%, línea diagonal, cursor: not-allowed, disabled
```

---

## 4. Flujo en `ProductDetail`

```
┌─────────────────────────────────────────────────────┐
│ useQuery: Obtiene product + variants                │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│ hasVariants = variants.length > 0                   │
│ (dinámico, no depende de has_variants)              │
└──────────────┬──────────────────────────────────────┘
               │
        ┌──────┴──────┐
        │             │
    SÍ (con)     NO (sin)
        │             │
        ▼             ▼
   Mostrar        Precio/Stock/Imagen
   VariantSelector directo del Product
        │
        ▼
   User selecciona
   (cascada automática)
        │
        ▼
   effectivePrice = selectedVariant.price ?? product.price
   effectiveStock = selectedVariant.stock ?? product.stock
   effectiveImage = selectedVariant.image_url ?? product.images[0]
        │
        ▼
   "Agregar al carrito"
   (validar: ¿variante completa + stock?)
```

### Validación en "Agregar al Carrito"

```javascript
const needsVariantSelection = hasVariants && !selectedVariant;

<Button disabled={!inStock || needsVariantSelection}>
  {needsVariantSelection ? 'Selecciona variante' : 'Agregar'}
</Button>
```

---

## 5. Integración con Admin (`AdminVariantManager`)

### Crear Variante
Admin rellena:
1. **Atributos** (dinámicos, N campos):
   - Tipo: Selector + autocomplete
   - Valor: Input de texto libre
   - Botón "+ Agregar otro atributo"

2. **Datos técnicos**:
   - SKU (opcional)
   - Precio (hereda del producto si vacío)
   - Stock (requerido)
   - Imagen (opcional)
   - `is_active` (por defecto true)

### Ejemplo de Flujo
```
Crear variante para "Camiseta Classic":
  [Tipo: Color] [Valor: Rojo]
  + Agregar otro atributo
  [Tipo: Talla] [Valor: XL]
  [SKU: CAMISETA-001-ROJO-XL]
  [Stock: 25]
  [Precio: vacío → hereda $29.99]
  [Imagen: camiseta-roja.jpg]
  
  → Guarda: ProductVariant(
      product_id: "prod_001",
      attributes: { "Color": "Rojo", "Talla": "XL" },
      name: "Rojo / XL",
      sku: "...",
      stock: 25,
      price: undefined (usa base),
      image_url: "..."
    )
```

---

## 6. Preguntas Frecuentes (FAQ)

### ¿Qué pasa si agrego una variante con atributos nuevos?
✅ El sistema detecta automáticamente los nuevos atributos.
```javascript
// Antes: ["Color", "Talla"]
// Agrego: {Color: "Rojo", Talla: "XL", Material: "Seda"}
// Ahora:  ["Color", "Talla", "Material"]
```

### ¿Puedo mezclar variantes con diferentes atributos?
⚠️ **Posible pero no recomendado**. Si haces:
- Variante 1: {Color, Talla}
- Variante 2: {Color, Tamaño} (diferente nombre)

El sistema verá 3 atributos distintos. **Mantén consistencia en nombres.**

### ¿Qué pasa si no tengo stock en una combinación?
✓ Se muestra atenuada (50% opacidad + línea diagonal).
✓ El usuario puede hacer clic pero verá "Sin stock en esta combinación".
✓ No puede agregar al carrito.

### ¿Puedo cambiar atributos de un producto después de crear variantes?
⚠️ **Sí**, pero:
- Las variantes existentes siguen siendo válidas
- Si cambias el nombre de un atributo, las variantes no se actualizan
- **Recomendación**: Define bien la estructura antes de crear muchas variantes

### ¿Cómo cambio la imagen principal según la variante?
```javascript
// En ProductDetail:
const displayImage = selectedVariant?.image_url || product.images?.[0];

// Si selectedVariant.image_url existe, la usa
// Si no, vuelve a la imagen base del producto
```

### ¿Puede un producto tener variantes y no tener `has_variants: true`?
✅ **Sí**. El sistema detecta `variants.length > 0` automáticamente.
- `has_variants` es solo una bandera de convención
- No es requerida técnicamente

---

## 7. Optimizaciones y Escalabilidad

### Performance
- **Memoización**: `useMemo` en `attrKeys`, `getAttrValues`, `isValueAvailable`
- **Lazy rendering**: Atributos se renderizan bajo demanda
- **Caché**: TanStack Query cachea variantes por producto

### Preparado para Escala
- ✅ **Cualquier cantidad de atributos**
- ✅ **Cualquier tipo de producto**
- ✅ **Combinaciones N-dimensionales**
- ✅ **Stock dinámico por combinación**
- ✅ **Precio dinámico por combinación**
- ✅ **Imagen dinámica por combinación**

### Futuras Mejoras
1. **Filtrado por atributo en catálogo** (similar a Browse)
2. **Histogramas de disponibilidad** (ej: "5 colores disponibles")
3. **Presets/Combos** (ej: "Combo recomendado: Rojo + XL")
4. **Sincronización de precios** (atributos afectan precio base)
5. **Reglas de dependencia** (ej: algunos colores solo en ciertas tallas)

---

## 8. Checklist de Implementación

Para usar este sistema en un producto nuevo:

- [ ] Crear `Product` con `has_variants: true`
- [ ] Crear N `ProductVariant` con `attributes: { Attr1: "...", Attr2: "..." }`
- [ ] Verificar que cada variante tiene `stock` definido
- [ ] Opcional: Agregar `image_url` a variantes con cambio visual
- [ ] Opcional: Agregar `price` si es diferente del base
- [ ] Probar en `ProductDetail`: Debe mostrar VariantSelector automáticamente
- [ ] Verificar cascada: Cambiar atributos, confirmar que otros se actualizan

---

**Última actualización:** 2 de abril de 2026  
**Versión:** 1.0 (Escalable, agnóstica de tipo de producto)