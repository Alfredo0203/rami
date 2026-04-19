# Plan de Implementación: Sistema de Vendedores (Marketplace)

## 1. ARQUITECTURA GENERAL

### Roles y Permisos
```
┌─────────────────────┐
│ admin               │ ← Panel global, control total
├─────────────────────┤
│ vendor              │ ← Acceso a SU tienda + productos + pedidos
├─────────────────────┤
│ customer (default)  │ ← Navegar, comprar, wishlist, órdenes
└─────────────────────┘
```

### Relaciones
```
User (vendor) ──owns──> Store
                          ├─> Products
                          ├─> Orders (entrada de pedidos)
                          └─> Inventory
```

---

## 2. CAMBIOS EN ENTITIES

### User Entity (Modificar)
```json
{
  "role": {
    "enum": ["admin", "vendor", "customer"],
    "default": "customer",
    "description": "Rol del usuario en el sistema"
  },
  "vendor_store_id": {
    "type": "string",
    "description": "ID de la tienda si el usuario es vendedor. NULL para admin/customer"
  },
  "vendor_status": {
    "type": "string",
    "enum": ["active", "suspended", "pending_approval"],
    "default": "active",
    "description": "Estado de activación como vendedor (para validación futura)"
  }
}
```

### Store Entity (Modificar)
```json
{
  "owner_id": {
    "type": "string",
    "description": "User ID del propietario vendedor. Cambiar de owner_email a owner_id"
  },
  "store_type": {
    "enum": ["owner", "external", "vendor"],
    "default": "vendor",
    "description": "owner=tienda principal, vendor=tienda de vendedor"
  },
  "commission_rate": {
    "type": "number",
    "default": 0,
    "description": "Comisión que cobra la app (futura)"
  }
}
```

### Nueva Entity: VendorStats (Opcional pero útil)
```json
{
  "name": "VendorStats",
  "type": "object",
  "properties": {
    "vendor_id": {"type": "string"},
    "store_id": {"type": "string"},
    "total_sales": {"type": "number", "default": 0},
    "total_orders": {"type": "number", "default": 0},
    "avg_rating": {"type": "number", "default": 0},
    "products_count": {"type": "number", "default": 0},
    "last_updated": {"type": "string", "format": "date-time"}
  }
}
```

---

## 3. CONTROL DE ACCESO (Security Rules)

### Backend Functions - Validaciones
```javascript
// Patrón a aplicar en todas las funciones que accesen a datos de tienda:

async function validateVendorAccess(userId, storeId) {
  const user = await base44.auth.me();
  
  if (!user) throw new Error('Unauthorized');
  
  if (user.role === 'admin') return true; // Admin puede todo
  
  if (user.role === 'vendor') {
    if (user.vendor_store_id !== storeId) {
      throw new Error('Forbidden: No tienes acceso a esta tienda');
    }
    return true;
  }
  
  throw new Error('Forbidden: Solo admin y vendedores pueden acceder');
}
```

### Frontend - Route Guards
```javascript
// Para proteger páginas vendedor:
- /vendor/dashboard (requiere role=vendor)
- /vendor/products (requiere role=vendor)
- /vendor/orders (requiere role=vendor)
- /vendor/store-settings (requiere role=vendor)
```

---

## 4. CAMBIOS EN COMPONENTES Y PÁGINAS

### Nuevas Páginas
```
pages/
  ├── VendorDashboard.jsx        (resumen de tienda + ventas)
  ├── VendorProducts.jsx         (CRUD de productos)
  ├── VendorOrders.jsx           (pedidos de la tienda)
  ├── VendorStoreSettings.jsx    (datos de tienda)
  └── VendorOnboarding.jsx       (flujo de conversión a vendedor)
```

### Modificar Páginas Existentes
```
pages/Admin.jsx
  └── Agregar pestaña "Vendedores" para:
      - Crear/asignar vendedores
      - Suspender/activar vendedores
      - Ver estadísticas globales de vendedores
```

### Componentes Nuevos
```
components/vendor/
  ├── VendorNav.jsx              (navegación específica para vendedor)
  ├── VendorProtectedRoute.jsx   (guard para rutas vendedor)
  ├── SalesChart.jsx             (gráfico de ventas)
  ├── OrderList.jsx              (pedidos recientes)
  ├── InventoryAlert.jsx         (productos con bajo stock)
  └── StoreStats.jsx             (tarjetas de estadísticas)

components/admin/
  └── AdminVendorsTab.jsx        (agregar pestaña en Admin)
```

---

## 5. FLUJOS PRINCIPALES

### Flujo 1: Crear Vendedor (Admin)
```
1. Admin crea usuario con role="vendor"
2. Admin asigna vendor_store_id (tienda existente o nueva)
3. Sistema valida: una tienda = un vendedor (1:1 por ahora)
4. Vendedor recibe email de onboarding
5. Vendedor completa perfil y crea contraseña
6. Vendedor accede a su dashboard
```

### Flujo 2: Vendedor Gestiona Tienda
```
1. Vendedor entra a /vendor/dashboard
2. Sistema valida: user.vendor_store_id vs datos solicitados
3. Vendedor ve:
   - Resumen de ventas (últimos 7 días, mes, total)
   - Pedidos recientes (filtrados por su tienda)
   - Productos más vendidos
   - Inventario bajo
   - Información de tienda (editable)
```

### Flujo 3: Vendedor Crea Producto
```
1. Vendedor entra a /vendor/products → "Crear Producto"
2. Automáticamente store_id = vendor.vendor_store_id
3. Vendedor llena formulario (igual al actual pero sin seleccionar tienda)
4. Producto se crea con store_id asignado
5. Vendedor puede editar solo SUS productos
```

### Flujo 4: Vendedor Administra Pedidos
```
1. Vendedor entra a /vendor/orders
2. Ve solo pedidos que contienen sus productos
3. Puede cambiar estado (pending → processing → shipped → delivered)
4. NO puede ver detalles de otros pedidos
```

---

## 6. CAMBIOS EN FUNCIONES BACKEND

### Funciones a Crear/Modificar

```javascript
// VENDEDOR - GESTIÓN
getVendorDashboard(storeId)           // GET datos dashboard
getVendorOrders(storeId, filters)     // GET pedidos de tienda
updateVendorOrderStatus(orderId, status) // PATCH estado
getVendorProducts(storeId)            // GET productos de tienda
getVendorStats(storeId)               // GET estadísticas

// ADMIN - VENDEDORES
createVendor(email, storeId)          // POST nuevo vendedor
suspendVendor(vendorId)               // PATCH suspender
activateVendor(vendorId)              // PATCH activar
assignVendorToStore(vendorId, storeId) // PATCH asignación
getVendorStats()                      // GET stats globales de vendedores
```

### Validaciones en Cada Función
```javascript
// Template de validación:
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  
  if (!user) return Response.json({error: 'Unauthorized'}, {status: 401});
  
  const { storeId } = await req.json();
  
  // VALIDACIÓN: Vendedor solo accede a su tienda
  if (user.role === 'vendor' && user.vendor_store_id !== storeId) {
    return Response.json({error: 'Forbidden'}, {status: 403});
  }
  
  // VALIDACIÓN: Customer no puede acceder
  if (user.role === 'customer') {
    return Response.json({error: 'Forbidden'}, {status: 403});
  }
  
  // Lógica de negocio...
});
```

---

## 7. COMPONENTES UI MOCKUP

### VendorDashboard - Layout
```
┌─────────────────────────────────────────┐
│ Header: Bienvenido, [Nombre Tienda]     │
├─────────────────────────────────────────┤
│ ┌─────────────┬─────────────┬────────┐  │
│ │ Sales $$$   │ Orders ###  │ Rating │  │
│ └─────────────┴─────────────┴────────┘  │
├─────────────────────────────────────────┤
│ Sales Chart (últimos 7 días)            │
├─────────────────────────────────────────┤
│ ┌──────────────────┬──────────────────┐ │
│ │ Pedidos Recientes│ Bajo Stock       │ │
│ │ - Pedido #001    │ - Producto A (2) │ │
│ │ - Pedido #002    │ - Producto B (1) │ │
│ └──────────────────┴──────────────────┘ │
└─────────────────────────────────────────┘
```

### VendorNav
```
Bottom Tab Nav OR Sidebar:
├─ Dashboard (home icon)
├─ Productos (box icon)
├─ Pedidos (package icon)
└─ Tienda (store icon)
```

---

## 8. ROADMAP DE IMPLEMENTACIÓN

### FASE 1: Estructura Base (Priority: HIGH)
- [ ] Modificar User entity (agregar vendor_store_id, vendor_status)
- [ ] Modificar Store entity (owner_id, store_type)
- [ ] Crear VendorProtectedRoute component
- [ ] Crear VendorDashboard página básica
- [ ] Crear AdminVendorsTab en Admin

### FASE 2: Gestión de Tienda (Priority: HIGH)
- [ ] Crear VendorStoreSettings página
- [ ] Crear VendorProducts página
- [ ] Backend: getVendorProducts(), updateVendorProduct()
- [ ] Validaciones de seguridad en backend

### FASE 3: Gestión de Pedidos (Priority: MEDIUM)
- [ ] Crear VendorOrders página
- [ ] Backend: getVendorOrders(), updateVendorOrderStatus()
- [ ] Filtrar órdenes por tienda en frontend

### FASE 4: Dashboard Completo (Priority: MEDIUM)
- [ ] SalesChart component
- [ ] VendorStats entity y automations
- [ ] Gráficos y estadísticas
- [ ] Onboarding flow

### FASE 5: Admin Vendedores (Priority: LOW)
- [ ] AdminVendorsTab completo
- [ ] Crear/suspender/activar vendedores
- [ ] Estadísticas globales

### FASE 6: Escalabilidad (Priority: FUTURE)
- [ ] Empleados de tienda (manager, employee)
- [ ] Comisiones y pagos
- [ ] Reportes avanzados
- [ ] Solicitud automática para vender

---

## 9. CONSIDERACIONES TÉCNICAS

### Seguridad
- Siempre validar user.vendor_store_id en backend
- No confiar en storeId del cliente para validar acceso
- Usar base44.auth.me() en cada función

### Performance
- Crear índices en: Store.owner_id, User.vendor_store_id
- Cachear datos del vendedor (React Query)
- Paginación en órdenes/productos

### Migración de Datos
- Tiendas existentes: asignar owner_id basado en owner_email
- Usuarios existentes: role = "customer" por defecto
- Script de migración para Store.store_type

---

## 10. EJEMPLO: Crear Primer Vendedor (Admin)

```
1. Admin entra a /Admin → Vendedores
2. Click "Crear Vendedor"
3. Formulario:
   - Email: vendedor@example.com
   - Nombre Tienda: "Mi Tienda"
   - Teléfono: +503 7777 7777
4. Sistema:
   - Crea User(role=vendor, vendor_store_id=store123)
   - Crea/vincula Store(owner_id=user123)
   - Envía email con link para configurar contraseña
5. Vendedor:
   - Clickea link, configura contraseña
   - Completa perfil de tienda
   - Accede a /vendor/dashboard

✅ Vendedor ahora tiene acceso solo a su tienda
```

---

## RESUMEN DE CAMBIOS

| Área | Cambio |
|------|--------|
| **Entities** | User (+vendor_store_id), Store (+owner_id) |
| **Pages** | +5 nuevas páginas Vendor |
| **Components** | +6 componentes vendor, +1 pestaña admin |
| **Backend Functions** | +8 nuevas funciones vendor-specific |
| **Security** | Validaciones en TODAS las funciones |
| **UI** | Navegación diferenciada por rol |

---

## NOTAS IMPORTANTES

1. **Una tienda = un vendedor (por ahora)**: Simplifica lógica inicial
2. **Migración gradual**: Usuarios existentes siguen como "customer"
3. **Admin sigue siendo soberano**: Accede a todo sin restricciones
4. **Preparar para el futuro**: Estructura lista para múltiples usuarios por tienda
5. **Diseño consistente**: Seguir paleta de colores y componentes existentes