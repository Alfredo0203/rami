# 📋 Políticas de la Aplicación — RAmi

> Documento de revisión manual. No editar código, solo referencia.

---

## 1. POLÍTICA DE CANCELACIÓN DE PEDIDOS

### Por el cliente (cancelOrder)
| Método de pago | ¿Puede cancelar? | Ventana | Reembolso |
|---|---|---|---|
| Contraentrega (cash_on_delivery) | ✅ Sí | Sin límite de tiempo | No aplica |
| Tarjeta / online (credit_card, paypal) | ✅ Sí | Solo dentro de las **primeras 24 horas** | Reembolso automático vía Stripe |
| Tarjeta / online — después de 24h | ❌ No | Expirado | Debe contactar soporte |

### Estados cancelables
- `pending` ✅
- `processing` ✅
- `shipped` ❌ (no se puede cancelar)
- `delivered` ❌ (no se puede cancelar)
- `cancelled` ❌ (ya está cancelado)

### Cancelación automática (cancelAbandonedOrders)
- Se ejecuta cada 5 minutos (automation programada)
- Cancela órdenes con `payment_status=pending_payment` y `status=pending` que lleven **más de 30 minutos** sin ser pagadas
- Marca `payment_status=failed`
- **No restaura stock** (nunca fue descontado)

### Cancelación por admin (updateOrderStatus)
- Un admin puede cancelar cualquier orden en `pending` o `processing`
- La restauración de stock la maneja automáticamente `onOrderCancelled`

---

## 2. POLÍTICA DE INVENTARIO / STOCK

### ¿Cuándo se descuenta el stock?
| Método de pago | Momento del descuento |
|---|---|
| Contraentrega | Al crear el pedido (`placeOrder`) |
| Tarjeta / online | Al confirmar el pago (`confirmOrder`) |

### ¿Cuándo se restaura el stock?
- **Único punto de restauración:** automatización `onOrderCancelled` (se dispara cuando `status` cambia a `cancelled`)
- Solo restaura si `stockWasDeducted`:
  - `payment_method === 'cash_on_delivery'` → siempre
  - `payment_status === 'paid'` → pagos online confirmados
- Si la orden fue abandonada sin pagar → **no restaura** (correcto, nunca se descontó)

### Campos actualizados al vender
- Productos sin variantes: `stock` ↓, `sold_count` ↑
- Productos con variantes: `ProductVariant.stock` ↓, `Product.sold_count` (padre) ↑

### Campos restaurados al cancelar
- Productos sin variantes: `stock` ↑, `sold_count` ↓
- Productos con variantes: `ProductVariant.stock` ↑, `Product.sold_count` (padre) ↓

---

## 3. POLÍTICA DE CUPONES

### Uso de cupones
- Se valida código, fecha de vigencia, límite total y límite por usuario
- Al completar una orden (pago confirmado o contraentrega), se incrementa:
  - `Coupon.used_count` +1
  - `CouponAssignment.usage_count` +1 (si es cupón específico de usuario)
  - `CouponAssignment.status` → `'used'` si alcanzó el límite

### Reversión al cancelar
- `onOrderCancelled` decrementa `Coupon.used_count` -1
- Si es específico de usuario: `CouponAssignment.usage_count` -1 y `status` → `'available'`
- **Solo revierte si la orden tenía `coupon_code`**

---

## 4. POLÍTICA DE PAGOS

### Métodos disponibles (configurables en AppSettings)
- `credit_card` — Stripe (tarjeta de crédito/débito)
- `cash_on_delivery` — Contraentrega (pago al recibir)

### Flujo de pago con tarjeta
1. Cliente elige productos y dirección
2. Se crea la orden con `status=pending`, `payment_status=pending_payment`
3. Se abre modal de Stripe (PaymentIntent o Checkout)
4. Al confirmar pago exitoso → se llama `confirmOrder`
5. Orden pasa a `status=processing`, `payment_status=paid`
6. Se descuenta stock, limpia carrito, envía email

### Flujo de pago contraentrega
1. Cliente elige productos y dirección
2. Se crea la orden con `status=pending`, `payment_status=pending_payment`
3. Se descuenta stock inmediatamente en `placeOrder`
4. Se envía email de confirmación
5. Admin procesa y actualiza estado manualmente

---

## 5. POLÍTICA DE REEMBOLSOS

- Solo aplica a pedidos pagados con tarjeta (`credit_card` / `paypal`)
- Requiere que `payment_transaction_id` esté registrado
- Se procesa automáticamente vía **Stripe Refunds API**
- Condición: cancelación dentro de las **primeras 24 horas**
- Después de 24h: el cliente debe contactar soporte manualmente
- El `refund_id` queda guardado en `Order.internal_notes`

---

## 6. POLÍTICA DE ROLES Y PERMISOS

| Rol | Permisos |
|---|---|
| `admin` / `super_admin` | Acceso total: gestión de órdenes, productos, usuarios, cupones, inventario |
| `seller` | Acceso a SellerDashboard: gestiona solo sus propios productos |
| `user` (regular) | Solo puede ver y operar su propia cuenta, órdenes, carrito |
| Invitado (sin login) | Solo puede ver catálogo y Home |

---

## 7. POLÍTICA DE MODO DESARROLLO

- Controlado por `AppSettings.development_mode`
- Cuando está activo (`true`): usuarios regulares solo pueden acceder a la página Home
- Páginas deshabilitadas configurables via `AppSettings.disabled_pages`

---

## 8. POLÍTICA DE RESEÑAS

- Cualquier usuario puede dejar una reseña en productos
- `is_verified_purchase`: se marca si el usuario realmente compró el producto
- `is_approved` (default: `true`): los admins pueden moderar/ocultar reseñas
- El `rating` y `review_count` del producto se sincronizan desde las reseñas aprobadas

---

## 9. POLÍTICA DE DIRECCIONES

- Cada usuario puede tener múltiples direcciones guardadas
- Solo una puede ser `is_default: true`
- Campos obligatorios: nombre, apellido, teléfono, departamento, municipio, colonia, calle, número de casa
- País por defecto: El Salvador

---

## 10. HISTORIAL DE ESTADOS DE ÓRDENES

Cada cambio de estado queda registrado en `OrderStatusHistory` con:
- `order_id`, `user_email`, `status`, `timestamp`, `notes`

Flujo esperado de estados:
```
pending → processing → shipped → delivered
pending → cancelled
processing → cancelled
``