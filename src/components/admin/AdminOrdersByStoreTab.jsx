import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';
import AdminOrderCard from './AdminOrderCard';

export default function AdminOrdersByStoreTab() {
  const [selectedStoreId, setSelectedStoreId] = useState(null);

  const { data: stores = [], isLoading: loadingStores } = useQuery({
    queryKey: ['admin-all-stores'],
    queryFn: () => base44.entities.Store.list('-created_date'),
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => base44.entities.Order.list('-created_date'),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => base44.entities.Product.list(),
  });

  const storesWithOrders = useMemo(() => {
    // Tienda principal (sin store_id o null) primero
    const mainStoreOrders = orders.filter(o => {
      const hasMainStoreItem = o.items?.some(item => {
        const product = products.find(p => p.id === item.product_id);
        return !product?.store_id;
      });
      return hasMainStoreItem;
    });

    const storeGroups = [
      {
        id: 'main',
        name: 'Mi Tienda (Empresa)',
        store_id: null,
        orders: mainStoreOrders,
        orderCount: mainStoreOrders.length,
      },
    ];

    // Agregar tiendas de terceros
    stores.forEach(store => {
      const storeOrderIds = new Set();
      orders.forEach(o => {
        const hasStoreItem = o.items?.some(item => {
          const product = products.find(p => p.id === item.product_id);
          return product?.store_id === store.id;
        });
        if (hasStoreItem) storeOrderIds.add(o.id);
      });

      const storeOrders = Array.from(storeOrderIds).map(id => orders.find(o => o.id === id));

      if (storeOrders.length > 0) {
        storeGroups.push({
          id: store.id,
          name: store.name,
          store_id: store.id,
          owner_email: store.owner_email,
          orders: storeOrders.filter(Boolean),
          orderCount: storeOrders.length,
        });
      }
    });

    return storeGroups;
  }, [stores, orders, products]);

  const selectedStore = selectedStoreId 
    ? storesWithOrders.find(s => s.id === selectedStoreId)
    : storesWithOrders[0];

  if (loadingStores || loadingOrders) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-3">
      {/* Selector de tiendas */}
      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
        {storesWithOrders.map(store => (
          <button
            key={store.id}
            onClick={() => setSelectedStoreId(store.id)}
            className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              selectedStore?.id === store.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-muted'
            }`}
          >
            {store.name}
            <span className="ml-1 text-[10px] opacity-75">({store.orderCount})</span>
          </button>
        ))}
      </div>

      {/* Info de la tienda seleccionada */}
      {selectedStore && (
        <div className="bg-card rounded-xl p-3 shadow-sm space-y-1">
          <p className="font-semibold text-foreground text-sm">{selectedStore.name}</p>
          {selectedStore.owner_email && (
            <p className="text-xs text-muted-foreground">Propietario: {selectedStore.owner_email}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Total de pedidos: <span className="font-medium text-foreground">{selectedStore.orderCount}</span>
          </p>
        </div>
      )}

      {/* Pedidos de la tienda seleccionada */}
      {selectedStore?.orders.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground text-sm">Esta tienda aún no tiene pedidos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {selectedStore?.orders.map(order => (
            <AdminOrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}