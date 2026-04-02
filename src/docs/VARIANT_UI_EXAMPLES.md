# Ejemplos Visuales de Variantes — Guía de UI

## 1. Ropa (Camiseta)

### Estructura de Datos
```json
{
  "Product": {
    "name": "Camiseta Classic",
    "price": 29.99,
    "images": ["url-main.jpg"],
    "has_variants": true
  },
  "ProductVariants": [
    { "attributes": { "Color": "Rojo", "Talla": "S" }, "stock": 10, "image_url": "url-rojo.jpg" },
    { "attributes": { "Color": "Rojo", "Talla": "M" }, "stock": 15, "image_url": "url-rojo.jpg" },
    { "attributes": { "Color": "Rojo", "Talla": "L" }, "stock": 8 },
    { "attributes": { "Color": "Azul", "Talla": "S" }, "stock": 0, "image_url": "url-azul.jpg" },
    { "attributes": { "Color": "Azul", "Talla": "M" }, "stock": 20, "image_url": "url-azul.jpg" },
    { "attributes": { "Color": "Negro", "Talla": "M" }, "stock": 12 }
  ]
}
```

### Interfaz Visual

```
┌──────────────────────────────────┐
│      Camiseta Classic            │
│         $29.99                   │
├──────────────────────────────────┤
│  [Imagen: Rojo]                  │
│   Rojo / S — 10 disponibles ✓    │
├──────────────────────────────────┤

COLOR
 ┌─────┐  ┌─────┐  ┌─────┐
 │ 🔴  │  │ 🔵  │  │ ⚫  │
 │Rojo │  │Azul │  │Negro│
 └─────┘  └─────┘  └─────┘
  (sel)    (stock=0  (avail)
             tachado)

TALLA
 ┌────┐ ┌────┐ ┌────┐
 │ S  │ │ M  │ │ L  │
 └────┘ └────┘ └────┘
 (avail) (sel) (avail)

[Agregar al carrito]
```

**Comportamiento:**
- Al cambiar color → Tallas disponibles se actualizan
- "Azul" muestra línea diagonal (stock=0 en S, disponible en M)
- Al seleccionar "Azul" → Automáticamente salta a "M" (primera con stock)

---

## 2. Electrónica (Laptop)

### Estructura de Datos
```json
{
  "Product": {
    "name": "Laptop Pro 15",
    "price": 1299.99,
    "images": ["url-main.jpg"],
    "specifications": { "Procesador": "Intel i7", "Pantalla": "15.6 FHD" },
    "has_variants": true
  },
  "ProductVariants": [
    { "attributes": { "RAM": "8GB", "Almacenamiento": "256GB", "Color": "Plata" }, "price": 1299.99, "stock": 5 },
    { "attributes": { "RAM": "16GB", "Almacenamiento": "256GB", "Color": "Plata" }, "price": 1499.99, "stock": 3 },
    { "attributes": { "RAM": "16GB", "Almacenamiento": "512GB", "Color": "Plata" }, "price": 1699.99, "stock": 2 },
    { "attributes": { "RAM": "16GB", "Almacenamiento": "512GB", "Color": "Gris" }, "price": 1699.99, "stock": 1 }
  ]
}
```

### Interfaz Visual

```
┌──────────────────────────────────┐
│      Laptop Pro 15               │
│         $1,299.99                │
├──────────────────────────────────┤
│  [Imagen: Plata]                 │
│   16GB RAM / 512GB / Gris        │
│   $1,699.99                      │
├──────────────────────────────────┤

RAM
 ┌────────┐ ┌────────┐
 │ 8GB    │ │ 16GB   │
 └────────┘ └────────┘
 (avail)    (sel)

ALMACENAMIENTO
 ┌────────┐ ┌────────┐
 │ 256GB  │ │ 512GB  │
 └────────┘ └────────┘
 (avail)    (sel)

COLOR
 ┌──────┐ ┌──────┐
 │Plata │ │ Gris │
 └──────┘ └──────┘
 (avail)  (sel)

Total: $1,699.99
[Agregar al carrito]
```

**Particularidades:**
- Precio **cambia dinámicamente** según selección (8GB=$1,299 vs 16GB=$1,499+)
- 3 dimensiones de selección
- Sin imágenes por atributo (todos igual)
- Stock limitado en algunas combos

---

## 3. Zapatos

### Estructura de Datos
```json
{
  "Product": {
    "name": "Zapatilla Running Pro",
    "price": 89.99,
    "original_price": 129.99,
    "images": ["url-main.jpg"],
    "has_variants": true
  },
  "ProductVariants": [
    { "attributes": { "Color": "Negro", "Talla": "39" }, "stock": 12, "image_url": "url-negro.jpg" },
    { "attributes": { "Color": "Negro", "Talla": "40" }, "stock": 8, "image_url": "url-negro.jpg" },
    { "attributes": { "Color": "Negro", "Talla": "41" }, "stock": 5, "image_url": "url-negro.jpg" },
    { "attributes": { "Color": "Blanco", "Talla": "39" }, "stock": 0, "image_url": "url-blanco.jpg" },
    { "attributes": { "Color": "Blanco", "Talla": "40" }, "stock": 10, "image_url": "url-blanco.jpg" },
    { "attributes": { "Color": "Gris", "Talla": "40" }, "stock": 7, "image_url": "url-gris.jpg" }
  ]
}
```

### Interfaz Visual

```
┌──────────────────────────────────┐
│   Zapatilla Running Pro          │
│    $89.99  (antes $129.99)       │
│        -30% OFF ⚡               │
├──────────────────────────────────┤
│  [Imagen: Negro]                 │
│   Negro / 40 — Stock: 8 ✓        │
├──────────────────────────────────┤

COLOR
 ┌─────────┐ ┌─────────┐ ┌───────┐
 │ [⚫]    │ │ [⚪]    │ │[⚫✓]  │
 │ Negro  │ │ Blanco  │ │ Gris  │
 └─────────┘ └─────────┘ └───────┘
 (avail)     (stock=0    (sel)
              en 39)

TALLA
 ┌────┐ ┌────┐ ┌────┐
 │39  │ │40  │ │41  │
 └────┘ └────┘ └────┘
 (avail) (sel) (avail)

[Cantidad: 1 ▲▼]
[Agregar al carrito]
```

**Particularidades:**
- Descuento mostrado en producto
- Imágenes diferentes por color (Swatches visuales)
- Combinación "Blanco 39" no tiene stock (tachada)
- Flujo intuitivo: selecciona color → automáticamente primera talla con stock

---

## 4. Belleza (Perfume)

### Estructura de Datos
```json
{
  "Product": {
    "name": "Perfume Essence",
    "price": 64.99,
    "images": ["url-main.jpg"],
    "specifications": { "Concentración": "Eau de Parfum", "Familia": "Floral Oriental" },
    "has_variants": true
  },
  "ProductVariants": [
    { "attributes": { "Volumen": "30ml", "Aroma": "Floral" }, "price": 34.99, "stock": 20 },
    { "attributes": { "Volumen": "50ml", "Aroma": "Floral" }, "price": 64.99, "stock": 15 },
    { "attributes": { "Volumen": "100ml", "Aroma": "Floral" }, "price": 99.99, "stock": 5 },
    { "attributes": { "Volumen": "50ml", "Aroma": "Oriental" }, "price": 64.99, "stock": 8 }
  ]
}
```

### Interfaz Visual

```
┌──────────────────────────────────┐
│       Perfume Essence            │
│          $64.99                  │
├──────────────────────────────────┤
│  [Imagen: Frasco]                │
│   50ml / Floral — Stock: 15 ✓    │
├──────────────────────────────────┤

AROMA
 ┌──────────┐ ┌──────────┐
 │ Floral   │ │ Oriental │
 └──────────┘ └──────────┘
 (sel)        (avail)

VOLUMEN
 ┌─────┐  ┌─────┐  ┌─────┐
 │30ml │  │50ml │  │100ml│
 │$34  │  │$64  │  │$99  │
 └─────┘  └─────┘  └─────┘
 (avail)  (sel)    (avail)

[Agregar al carrito]
```

**Particularidades:**
- Precio **cambia según volumen** (30ml=$34, 100ml=$99)
- 2 dimensiones simples
- Sin imágenes por atributo
- Los chips muestran precio dinámico

---

## 5. Hogar (Sábanas)

### Estructura de Datos
```json
{
  "Product": {
    "name": "Juego de Sábanas Premium",
    "price": 59.99,
    "original_price": 89.99,
    "images": ["url-main.jpg"],
    "specifications": { "Material": "Algodón 100%", "Hilos": "300tc" },
    "has_variants": true
  },
  "ProductVariants": [
    { "attributes": { "Tamaño": "Twin", "Color": "Blanco" }, "stock": 25, "image_url": "url-blanco.jpg" },
    { "attributes": { "Tamaño": "Twin", "Color": "Azul" }, "stock": 18, "image_url": "url-azul.jpg" },
    { "attributes": { "Tamaño": "Queen", "Color": "Blanco" }, "stock": 30, "image_url": "url-blanco.jpg" },
    { "attributes": { "Tamaño": "Queen", "Color": "Azul" }, "stock": 12, "image_url": "url-azul.jpg" },
    { "attributes": { "Tamaño": "Queen", "Color": "Gris" }, "stock": 8, "image_url": "url-gris.jpg" },
    { "attributes": { "Tamaño": "King", "Color": "Blanco" }, "stock": 10, "image_url": "url-blanco.jpg" }
  ]
}
```

### Interfaz Visual

```
┌──────────────────────────────────┐
│   Juego de Sábanas Premium       │
│    $59.99  (antes $89.99)        │
│          -33% OFF                │
├──────────────────────────────────┤
│  [Imagen: Blanco]                │
│   Queen / Blanco — Stock: 30 ✓   │
├──────────────────────────────────┤

TAMAÑO
 ┌────────┐ ┌────────┐ ┌─────────┐
 │ Twin   │ │ Queen  │ │  King   │
 └────────┘ └────────┘ └─────────┘
 (avail)    (sel)     (avail)

COLOR
 ┌──────────┐ ┌──────────┐ ┌───────┐
 │ [⚪]    │ │ [🔵]    │ │[⚪✓]  │
 │ Blanco  │ │ Azul    │ │ Gris  │
 └──────────┘ └──────────┘ └───────┘
 (avail)      (avail)      (sel)

[Cantidad: 1 ▲▼]
[Agregar al carrito]
```

**Particularidades:**
- 2 dimensiones: Tamaño (texto) + Color (swatches)
- King size solo en Blanco (cascada: selecciona King → Gris desaparece)
- Stock abundante (diferencia notable con ropa)
- Descuento atractivo

---

## 6. Producto Sin Variantes

### Estructura de Datos
```json
{
  "Product": {
    "name": "Mouse Inalámbrico",
    "price": 24.99,
    "images": ["url.jpg"],
    "stock": 50,
    "has_variants": false  // ← Sin variantes
  }
}
```

### Interfaz Visual

```
┌──────────────────────────────────┐
│      Mouse Inalámbrico           │
│          $24.99                  │
├──────────────────────────────────┤
│  [Imagen]                        │
│  En stock (50 disponibles) ✓     │
├──────────────────────────────────┤

[Cantidad: 1 ▲▼]
[Agregar al carrito]
```

**Sin VariantSelector**
- Directo a carrito
- Sin cascadas ni selecciones
- Simple y rápido

---

## Principios de Diseño Aplicados

### 1. **Visual Hierarchy**
- Producto → Atributos en orden de importancia
- Color/Tamaño primero, detalles después
- Precio siempre visible

### 2. **Feedback Inmediato**
- Click en atributo → cambio instantáneo
- Imagen, precio, stock se actualizan en tiempo real
- Opciones no disponibles claramente marcadas

### 3. **Constraints Visuales**
- Deshabilitadas (no-click) = opciones inválidas
- Línea diagonal = sin stock
- Opacidad baja = estado "enfermo"

### 4. **Consistencia**
- Swatches para colores/imágenes
- Chips para texto/números
- Mismo estilo en todos los productos

### 5. **Mobile-First**
- Atributos en columna (no grid)
- Botones grandes y tapables
- Scroll suave dentro de la sección

---

## Snippets de Código Relevantes

### Preseleccionar Variante
```javascript
useEffect(() => {
  if (variants.length > 0 && !selectedVariant) {
    // Primer variant con stock
    const first = variants.find(v => (v.stock ?? 0) > 0) || variants[0];
    handleVariantSelect(first);
  }
}, [data]);
```

### Cambiar Imagen Según Variante
```javascript
const displayImage = selectedVariant?.image_url || product.images?.[0];
// Usa la imagen de la variante si existe, sino la del producto
```

### Validar Antes de Agregar
```javascript
const canAddToCart = !hasVariants || (hasVariants && selectedVariant);

<Button disabled={!canAddToCart || !inStock}>
  {!selectedVariant ? 'Selecciona una variante' : 'Agregar al carrito'}
</Button>
```

---

**Última actualización:** 2 de abril de 2026