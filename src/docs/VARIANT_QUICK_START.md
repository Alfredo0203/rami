# Variantes de Producto — Quick Start (5 min)

## TL;DR

✅ **Tu sistema ya funciona para Temu-style productos**  
✅ **Soporta cualquier tipo de producto (ropa, electrónica, belleza, etc.)**  
✅ **Cascada inteligente de selecciones automática**  
✅ **Escalable sin cambiar código**

---

## Estructura de Datos (Copiar/Pegar)

### Producto con Variantes
```json
{
  "name": "Mi Producto",
  "price": 29.99,
  "images": ["url1", "url2"],
  "has_variants": true
}
```

### Variante (Combinación de Atributos)
```json
{
  "product_id": "prod_001",
  "name": "Rojo / XL",
  "attributes": {
    "Color": "Rojo",
    "Talla": "XL",
    "Material": "Algodón"
  },
  "price": 29.99,
  "stock": 15,
  "sku": "PROD-001-ROJO-XL",
  "image_url": "url-rojo.jpg",
  "is_active": true
}
```

---

## Cómo Funciona

### 1️⃣ Admin Crea Variantes
- Abre Producto en Admin
- Click: "Agregar variante"
- Rellena: Color=Rojo, Talla=XL
- Click: "Guardar"
- Repite para cada combinación

### 2️⃣ Usuario Ve en ProductDetail
```
[Imagen]
Color: [🔴 Rojo] [🔵 Azul]
Talla: [S] [M] [L] [XL ✓]
Precio: $29.99
Stock: 15 disponibles
[Agregar al carrito]
```

### 3️⃣ Cascada Automática
- Click Azul → Automáticamente salta a primera talla con stock en Azul
- Click XL → Si no hay XL en Azul, muestra "sin stock"
- No permite combinaciones inválidas

---

## Componentes Principales

| Componente | Función |
|---|---|
| `VariantSelector.jsx` | Renderiza atributos, maneja cascada, valida |
| `ProductDetail.jsx` | Integra selector, controla preselección |
| `AdminVariantManager.jsx` | Crea/edita variantes (admin) |
| `ProductVariant` entity | Almacena combinaciones |

---

## Casos de Uso

### Ropa
```json
{ "Color": "Rojo", "Talla": "M", "Fit": "Regular" }
{ "Color": "Azul", "Talla": "L", "Fit": "Slim" }
```

### Electrónica
```json
{ "RAM": "8GB", "Almacenamiento": "256GB", "Color": "Plata" }
{ "RAM": "16GB", "Almacenamiento": "512GB", "Color": "Gris" }
```

### Belleza
```json
{ "Volumen": "30ml", "Aroma": "Floral" }
{ "Volumen": "100ml", "Aroma": "Oriental" }
```

### Hogar
```json
{ "Tamaño": "Twin", "Color": "Blanco" }
{ "Tamaño": "King", "Color": "Gris" }
```

---

## Validaciones Automáticas

✅ Deshabilita opciones sin stock  
✅ Bloquea combinaciones inválidas  
✅ Preselecciona primera con stock  
✅ Impide agregar sin variante completa  
✅ Muestra línea diagonal en opciones agotadas  

---

## Personalización Visual

### Swatches (para colores/imágenes)
Si el atributo contiene "color" o tiene `image_url`:
```
┌─────────┐
│ [Imagen]│ ← Muestra foto
│ Rojo    │
│  [✓]    │ ← Badge si seleccionado
└─────────┘
```

### Chips (para talla/capacidad/tipo)
```
┌─────────────┐
│ XL          │ ← Botón simple
│  [✓]        │ ← Badge si seleccionado
└─────────────┘
```

**Automático**: Sistema detecta y aplica el estilo correcto.

---

## Características Clave

| Feature | Soportado | Notas |
|---|---|---|
| N atributos | ✅ | Color + Talla + Material + ... |
| Cascada inteligente | ✅ | Cambia automáticamente según disponibilidad |
| Precio dinámico | ✅ | Variante puede tener precio diferente |
| Stock dinámico | ✅ | Stock por combinación |
| Imagen por variante | ✅ | Opcional, automática |
| SKU por variante | ✅ | Para inventario/envíos |
| Producto sin variantes | ✅ | Fallback simple directo a carrito |
| Preselección inteligente | ✅ | Salta a primera con stock |
| Validación de carrito | ✅ | Bloquea incompleto |
| Mobile responsive | ✅ | Optimizado para móvil |
| Escalable | ✅ | Sin cambios de código |

---

## Datos Mínimos para Funcionar

```javascript
// Necesario
ProductVariant: {
  product_id: "...",
  name: "Rojo / XL",
  attributes: { "Color": "Rojo", "Talla": "XL" },
  stock: 15
}

// Opcional (pero recomendado)
ProductVariant: {
  price: 29.99,           // Hereda del producto si vacío
  image_url: "url",       // Cambia imagen si se selecciona
  sku: "SKU-001",         // Para tracking
  is_active: true         // Control de disponibilidad
}
```

---

## Flujo de Datos

```
Usuario en ProductDetail
    ↓
[Obtiene variantes con useQuery]
    ↓
[Preselecciona primera con stock]
    ↓
[Renderiza VariantSelector]
    ↓
Usuario clickea atributo
    ↓
[Cascada: busca mejor combinación]
    ↓
[Actualiza precio, imagen, stock]
    ↓
Usuario clickea "Agregar"
    ↓
[Valida: ¿variante completa + stock?]
    ↓
[Crea CartItem con variant_id]
    ↓
✓ Agregado al carrito
```

---

## Debugging: Si Algo No Funciona

### Variantes no aparecen
- [ ] ¿`has_variants: true` en Product?
- [ ] ¿ProductVariants creadas con `product_id` correcto?
- [ ] ¿Variantes tienen `is_active: true`?

### Cascada no funciona
- [ ] ¿Atributos con nombres consistentes en todas variantes?
- [ ] ¿Stock correcto por variante?
- [ ] ¿`stock > 0` = habilitado automáticamente?

### Imagen no cambia
- [ ] ¿Variante tiene `image_url`?
- [ ] ¿URLs son válidas?

### Precio incorrecto
- [ ] ¿Variante tiene `price` definido?
- [ ] ¿Si vacío, usa `product.price`?

---

## API Rápida (Funciones Clave)

### En ProductDetail
```javascript
const handleVariantSelect = (variant) => {
  setSelectedVariant(variant);
  // Automático: updatePrice, updateImage, updateStock
}

const effectivePrice = selectedVariant?.price ?? product.price;
const effectiveStock = selectedVariant?.stock ?? product.stock;
const effectiveImage = selectedVariant?.image_url ?? product.images?.[0];
```

### En VariantSelector
```javascript
const isValueAvailable = (attrKey, attrValue) => {
  // Busca si existe combinación con stock
  return variants.some(v => 
    v.attributes?.[attrKey] === attrValue && 
    (v.stock ?? 0) > 0
  );
};

const handleSelect = (attrKey, attrValue) => {
  // Cascada: busca mejor match con los atributos seleccionados
  const match = variants.find(v => /* lógica */);
  onSelect(match);
};
```

---

## Próximos Pasos

1. ✅ **Entender estructura** → Lee `VARIANT_ARCHITECTURE.md`
2. ✅ **Ver ejemplos visuales** → Lee `VARIANT_UI_EXAMPLES.md`
3. ✅ **Best practices** → Lee `VARIANT_BEST_PRACTICES.md`
4. ✅ **Crear producto de prueba**:
   - Admin → Nuevo producto
   - Admin → Agregar variantes
   - Ver en ProductDetail
   - Probar cascada, carrito, validaciones

---

## Soporte Rápido

**¿Necesito cambiar código?**
- ❌ Para agregar atributos → NO
- ❌ Para cambiar tipo de producto → NO
- ❌ Para cambiar número de variantes → NO
- ✅ Solo si quieres personalizar UI/UX → Edita `VariantSelector.jsx`

**¿Qué tan escalable es?**
- ✅ 2 atributos (ropa simple)
- ✅ 5 atributos (electrónica compleja)
- ✅ 1,000+ variantes por producto (lazy-loading)
- ✅ Cualquier tipo de producto (agnóstico)

---

**Última actualización:** 2 de abril de 2026  
Léelo en 5 minutos. Para detalles, consulta los otros documentos.