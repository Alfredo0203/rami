import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, MapPin, CreditCard, Banknote, Loader2, Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function Checkout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [allowedPaymentMethods, setAllowedPaymentMethods] = useState(['credit_card']);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: 'Home', full_name: '', phone: '', street: '', city: '', state: '', zip_code: '', country: 'United States'
  });
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    base44.entities.AppSettings.filter({ key: 'global' }).then(results => {
      const s = results[0];
      const methods = s?.allowed_payment_methods?.length ? s.allowed_payment_methods : ['credit_card'];
      setAllowedPaymentMethods(methods);
      setPaymentMethod(methods[0]);
    }).catch(() => {});
  }, []);

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart'],
    queryFn: () => base44.entities.CartItem.list(),
  });

  const { data: addresses = [], isLoading: loadingAddresses } = useQuery({
    queryKey: ['addresses', user?.email],
    queryFn: () => base44.entities.Address.filter({ created_by: user?.email }),
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
      setSelectedAddressId(defaultAddr.id);
    }
  }, [addresses, selectedAddressId]);

  const subtotal = cartItems.reduce((sum, item) => sum + (item.product_price || 0) * (item.quantity || 0), 0);
  const shipping = subtotal >= 15 ? 0 : 4.99;
  const total = subtotal + shipping;

  const saveAddressMutation = useMutation({
    mutationFn: (data) => base44.entities.Address.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setSelectedAddressId(data.id);
      setShowAddressForm(false);
      toast.success('¡Dirección guardada!');
    },
  });

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      const address = addresses.find(a => a.id === selectedAddressId);
      if (!address) throw new Error('Selecciona una dirección de envío');

      const shippingAddress = {
        full_name: address.first_name ? `${address.first_name} ${address.last_name}` : (address.full_name || ''),
        phone: address.phone,
        street: `${address.street}${address.house_number ? ' #' + address.house_number : ''}`,
        city: address.municipio || address.city || '',
        state: address.departamento || address.state || '',
        zip_code: address.zip_code || '',
        country: address.country || 'El Salvador',
      };

      // Clean cart items - only send required fields to avoid validation errors
      const cleanedCartItems = cartItems.map(item => ({
        id: item.id,
        product_id: item.product_id,
        variant_id: item.variant_id || undefined,
        quantity: item.quantity,
        product_name: item.product_name,
        variant_name: item.variant_name || undefined,
        product_image: item.product_image,
        product_price: item.product_price,
      }));

      const res = await base44.functions.invoke('placeOrder', {
        cartItems: cleanedCartItems,
        shippingAddress,
        paymentMethod,
      });

      if (res.data?.error) throw new Error(res.data.details?.join('\n') || res.data.error);
      return res.data.order;
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['public-catalog'] });
      navigate(createPageUrl('OrderConfirmation') + `?id=${order.id}`);
    },
    onError: (err) => {
      toast.error(err.message || 'Error al realizar el pedido');
    },
  });

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-foreground font-semibold mb-4">Tu carrito está vacío</p>
        <Button onClick={() => navigate(createPageUrl('Home'))} className="bg-primary text-primary-foreground rounded-full">
          Ir a comprar
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 bg-secondary rounded-full">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Finalizar Compra</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Shipping Address */}
        <div className="bg-card rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Dirección de Envío</h2>
          </div>

          {loadingAddresses ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          ) : addresses.length === 0 && !showAddressForm ? (
            <Button
              variant="outline"
              onClick={() => setShowAddressForm(true)}
              className="w-full border-dashed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Dirección
            </Button>
          ) : (
            <>
              {!showAddressForm && (
                <RadioGroup value={selectedAddressId} onValueChange={setSelectedAddressId} className="space-y-2">
                  {addresses.map(addr => (
                    <label key={addr.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedAddressId === addr.id ? 'border-primary bg-primary/5' : 'border-border'
                    }`}>
                      <RadioGroupItem value={addr.id} className="mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{addr.full_name} · {addr.label}</p>
                        <p className="text-xs text-muted-foreground">{addr.street}, {addr.city}, {addr.state} {addr.zip_code}</p>
                        <p className="text-xs text-muted-foreground">{addr.phone}</p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              )}

              {!showAddressForm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddressForm(true)}
                  className="mt-2 text-primary"
                >
                  <Plus className="w-3 h-3 mr-1" /> Agregar nueva dirección
                </Button>
              )}
            </>
          )}

          {showAddressForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nombre Completo</Label>
                  <Input value={newAddress.full_name} onChange={e => setNewAddress({...newAddress, full_name: e.target.value})} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Teléfono</Label>
                  <Input value={newAddress.phone} onChange={e => setNewAddress({...newAddress, phone: e.target.value})} className="h-9 text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Dirección</Label>
                <Input value={newAddress.street} onChange={e => setNewAddress({...newAddress, street: e.target.value})} className="h-9 text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Ciudad</Label>
                  <Input value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Estado</Label>
                  <Input value={newAddress.state} onChange={e => setNewAddress({...newAddress, state: e.target.value})} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Código Postal</Label>
                  <Input value={newAddress.zip_code} onChange={e => setNewAddress({...newAddress, zip_code: e.target.value})} className="h-9 text-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowAddressForm(false)}>Cancelar</Button>
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground"
                  onClick={() => saveAddressMutation.mutate(newAddress)}
                  disabled={saveAddressMutation.isPending}
                >
                  {saveAddressMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Dirección'}
                </Button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Payment Method */}
        <div className="bg-card rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Método de Pago</h2>
          </div>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-2">
            {[
              { value: 'credit_card', icon: CreditCard, label: 'Tarjeta de Crédito / Débito' },
              { value: 'cash_on_delivery', icon: Banknote, label: 'Contra Entrega', description: 'Pagas cuando recibes tu pedido' },
            ].filter(m => allowedPaymentMethods.includes(m.value)).map(method => {
              const Icon = method.icon;
              return (
                <label key={method.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  paymentMethod === method.value ? 'border-primary bg-primary/5' : 'border-border'
                }`}>
                  <RadioGroupItem value={method.value} className="mt-0.5" />
                  <Icon className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-sm text-foreground">{method.label}</span>
                    {method.description && <p className="text-xs text-muted-foreground">{method.description}</p>}
                  </div>
                </label>
              );
            })}
          </RadioGroup>
        </div>

        {/* Order Summary */}
        <div className="bg-card rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-foreground mb-3">Resumen del Pedido</h2>
          {cartItems.map(item => (
            <div key={item.id} className="flex justify-between text-sm py-1.5">
              <span className="text-muted-foreground">{item.product_name} × {item.quantity}</span>
              <span className="text-foreground font-medium">${(item.product_price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-border mt-2 pt-2 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Envío</span>
              <span className={shipping === 0 ? 'text-success' : 'text-foreground'}>{shipping === 0 ? 'GRATIS' : `$${shipping.toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
              <span className="text-foreground">Total</span>
              <span className="text-foreground">${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Place Order */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border px-4 py-3 safe-area-bottom">
        {paymentMethod === 'cash_on_delivery' && (
          <p className="text-xs text-muted-foreground text-center mb-2">
            💵 Pagarás <span className="font-semibold text-foreground">${total.toFixed(2)}</span> al recibir tu pedido
          </p>
        )}
        <Button
           onClick={() => placeOrderMutation.mutate()}
           disabled={placeOrderMutation.isPending || !selectedAddressId || !paymentMethod}
           className="w-full bg-primary text-primary-foreground font-bold h-12 rounded-full text-base max-w-lg mx-auto block"
         >
           {placeOrderMutation.isPending ? (
             <Loader2 className="w-5 h-5 animate-spin" />
           ) : (
             'Finalizar Compra'
           )}
         </Button>
      </div>
    </div>
  );
}