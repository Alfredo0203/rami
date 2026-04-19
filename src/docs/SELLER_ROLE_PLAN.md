# Plan de Implementación: Rol Vendedor

## 📋 Resumen Ejecutivo
Integración de un nuevo rol **"seller"** para permitir que usuarios administren tiendas individuales dentro del marketplace. El vendedor solo tendrá acceso a su propia tienda y sus productos.

---

## 🏗️ 1. CAMBIOS EN ENTIDADES

### 1.1 User Entity (Actualizar roles)
**Cambio:** Agregar `"seller"` al enum de roles

```json
{
  "role": {
    "type": "string",
    "enum": ["user", "admin", "seller", "super_admin"],
    "default": "user",
    "description": "User role"
  }
}
```

### 1.2 Store Entity (Actualizar)
**Cambio:** Agregar campo `owner_email` (ya existe pero validar)

La relación es: **1 Usuario ↔ N Tiendas** (preparado para el futuro, ahora será 1:1)

```json
{
  "owner_email": {
    "type": "string",
    "description": "Email del usuario propietario de la tienda"
  }
}
```

---

## 🔐 2. CONTROL DE ACCESO (Seguridad)

### 2.1 Rutas Protegidas por Rol

| Ruta | Admin | Seller | Customer | Notas |
|------|-------|--------|----------|-------|
| `/Admin` | ✅ | ❌ | ❌ | Solo admins |
| `/SellerDashboard` | ✅ (todas) | ✅ (su tienda) | ❌ | Dashboard del vendedor |
| `/Browse` | ✅ | ✅ | ✅ | Ver tiendas públicas |
| `/Orders` | ✅ (todas) | ✅ (su tienda) | ✅ (sus órdenes) | Filtrado por tienda |
| `/Account` | ✅ | ✅ | ✅ | Perfil personal |

### 2.2 Validación Backend
Todas las peticiones que modifiquen datos deben validar:
```javascript
const seller = await base44.auth.me();
if (seller.role !== 'seller') return 403;

// Si es seller, validar que accede solo a su tienda
const store = await base44.entities.Store.get(storeId);
if (store.owner_email !== seller.email) return 403;
```

---

## 📊 3. SELLER DASHBOARD (`SellerDashboard.jsx`)

### 3.1 Componentes Principales

```
SellerDashboard
├── Header (nombre tienda, logo, opciones)
├── StatsCards
│   ├── Ingresos del mes
│   ├── Pedidos pendientes
│   ├── Productos activos
│   └── Stock bajo
├── Tabs
│   ├── Inicio (Overview)
│   ├── Productos
│   ├── Pedidos
│   ├── Inventario
│   └── Tienda (editar info)
└── Modals
    ├── ProductForm
    ├── OrderDetail
    └── InventoryModal
```

### 3.2 Datos del Dashboard

**Resumen (Overview):**
- Total ingresos (solo pedidos entregados)
- Pedidos pendientes/procesando
- Productos activos
- Productos con stock bajo (<5)
- Últimos 5 pedidos

**Productos Tab:**
- Listar productos de la tienda
- Crear/editar/eliminar producto
- Ver stock en tiempo real
- Activar/desactivar producto

**Pedidos Tab:**
- Solo pedidos de esta tienda
- Cambiar estado (pending → processing → shipped → delivered)
- Ver detalles del cliente
- Registrar número de seguimiento

**Inventario Tab:**
- Ver stock por producto/variante
- Historial de movimientos
- Ajustes de stock

**Tienda Tab:**
- Editar nombre de tienda
- Editar descripción
- Subir/cambiar logo
- Teléfono de contacto
- Validar que no edite tienda ajena

---

## 🎨 4. CAMBIOS EN LA UI EXISTENTE

### 4.1 Admin Panel
**AdminStoresTab:** Agregar botón "Asignar Vendedor"
- Selecciona usuario existente
- Cambia su rol a "seller"
- Vincula a la tienda

### 4.2 AdminUserCard
**Mostrar:**
- Si es seller, qué tienda administra
- Botón para desvincularlo

### 4.3 Layout / Navigation
**DevModeGuard:** Agregar reglas para sellers
- Sellers pueden acceder a: SellerDashboard, Browse, Orders (filtrado), Account
- No pueden acceder a: Admin

---

## 🛠️ 5. COMPONENTES A CREAR

```
components/seller/
├── SellerStats.jsx (Stats cards)
├── SellerProductsTab.jsx (Productos)
├── SellerOrdersTab.jsx (Pedidos)
├── SellerInventoryTab.jsx (Inventario)
├── SellerStoreTab.jsx (Info tienda)
└── SellerHeader.jsx (Header con nombre tienda)

pages/
└── SellerDashboard.jsx (Dashboard principal)

functions/
├── getSellerDashboard.js (Datos del dashboard)
└── updateOrderStatus.js (Ya existe, adaptar)
```

---

## 📝 6. FUNCIONALIDADES POR ROL

### Admin
- ✅ Ver todas las tiendas
- ✅ Crear tiendas
- ✅ Asignar sellers a tiendas
- ✅ Ver todos los productos
- ✅ Ver todos los pedidos
- ✅ Acceso total al Admin panel

### Seller
- ✅ Ver SOLO su tienda asignada
- ✅ Crear/editar/eliminar productos de su tienda
- ✅ Ver inventario de su tienda
- ✅ Ver pedidos de su tienda
- ✅ Cambiar estado de pedidos
- ✅ Editar info de su tienda
- ❌ NO ver otras tiendas
- ❌ NO acceder a Admin panel
- ❌ NO modificar usuarios

### Customer
- ✅ Ver catálogo público
- ✅ Hacer compras
- ✅ Ver sus pedidos
- ✅ Dejar reseñas

---

## 🔄 7. FLUJO DE CREACIÓN (Admin → Seller)

1. **Admin crea tienda** → `AdminStoresTab` → Nombre, descripción, logo
2. **Admin asigna seller** → Modal "Asignar Vendedor"
   - Busca usuario existente (role = "user")
   - Confirma asignación
   - Sistema actualiza: `User.role = "seller"` + vincula a tienda
3. **Seller recibe email** (opcional) con notificación
4. **Seller inicia sesión** → Lo redirige a `SellerDashboard`
5. **Seller gestiona tienda** → Productos, pedidos, inventario

---

## 🗄️ 8. QUERIES Y MUTATIONS NECESARIAS

```javascript
// Dashboard
base44.functions.invoke('getSellerDashboard', {})

// Productos (heredadas)
base44.entities.Product.create({...})
base44.entities.Product.update(id, {...})
base44.entities.Product.delete(id)

// Pedidos (heredadas, agregar filtro store_id)
base44.entities.Order.filter({...})
base44.entities.Order.update(id, {status: 'shipped', ...})

// Store (heredadas)
base44.entities.Store.update(id, {...})
```

---

## 🎯 9. VALIDACIONES DE SEGURIDAD

```javascript
// En cada endpoint del seller:
const user = await base44.auth.me();
if (user?.role !== 'seller') return 403;

// Si accede a recursos de tienda:
const store = await base44.entities.Store.get(storeId);
if (store.owner_email !== user.email) return 403; // ¡No es el propietario!

// Si accede a productos:
const product = await base44.entities.Product.get(productId);
const store = await base44.entities.Store.get(product.store_id);
if (store.owner_email !== user.email) return 403;

// Si accede a pedidos:
const order = await base44.entities.Order.get(orderId);
const orderStoreId = order.items[0].product_id // ← obtener store_id del producto
if (orderStoreId !== sellerStoreId) return 403;
```

---

## 🚀 10. ESCALABILIDAD FUTURA

Preparado para agregar después:

1. **Múltiples usuarios por tienda**
   - Campo `Store.staff_emails[]` (array de emails)
   - Campo `User.store_ids[]` (usuario puede administrar varias tiendas)

2. **Roles dentro de tienda**
   - `owner` (total access)
   - `manager` (sin acceso a reportes financieros)
   - `cashier` (solo gestión de inventario)

3. **Comisiones**
   - Campo `Store.commission_percentage`
   - Tabla `SellerPayouts` para registrar pagos

4. **Reportes avanzados**
   - Gráficos de ventas
   - Análisis de productos
   - Comparativas mensuales

5. **Solicitud automática**
   - Form de "Quiero vender"
   - Cola de aprobación (admin aprueba/rechaza)
   - Email de notificación

---

## 📱 11. DISEÑO Y ESTILOS

- **Colores:** Usar tokens existentes (primary, secondary, etc.)
- **Layout:** Responsive (mobile-first)
- **Tabs:** Similar a AdminPanel (usando `@/components/ui/tabs`)
- **Cards:** Reutilizar componentes existentes
- **Icons:** lucide-react (solo iconos validados)

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Base
- [ ] Actualizar User entity (agregar rol "seller")
- [ ] Crear SellerDashboard.jsx
- [ ] Crear componentes seller/
- [ ] Actualizar DevModeGuard (reglas seller)
- [ ] Agregar rutas en App.jsx

### Fase 2: Admin Integration
- [ ] Agregar botón "Asignar Vendedor" en AdminStoresTab
- [ ] Crear modal de asignación
- [ ] Actualizar AdminUserCard (mostrar tienda asignada)

### Fase 3: Backend & Security
- [ ] Crear getSellerDashboard.js
- [ ] Validar permisos en todas las mutaciones
- [ ] Testear que seller NO pueda acceder a otras tiendas

### Fase 4: Polish
- [ ] Emails de notificación (opcional)
- [ ] Documentación en-app
- [ ] Testing completo

---

**Versión:** 1.0  
**Última actualización:** 2026-04-19  
**Estado:** Plan completado, listo para implementación