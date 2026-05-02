import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, MapPin, CreditCard, Banknote, Loader2, Plus, Ticket, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import AddressForm from '@/components/addresses/AddressForm';
import WompiWidget from '@/components/shop/WompiWidget';

export default function Checkout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [allowedPaymentMethods, setAllowedPaymentMethods] = useState(['credit_card']);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [user, setUser] = useState(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [showWompiWidget, setShowWompiWidget] = useState(false);

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
  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === 'percentage') {
      discount = (subtotal * appliedCoupon.discount_value) / 100;
      if (appliedCoupon.maximum_discount_amount) {
        discount = Math.min(discount, appliedCoupon.maximum_discount_amount);
      }
    } else {
      discount = appliedCoupon.discount_value;
    }
  }
  const total = Math.max(0, subtotal - discount + shipping);

  const saveAddressMutation = useMutation({
    mutationFn: (data) => base44.entities.Address.create(data),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setSelectedAddressId(saved.id);
      setShowAddressForm(false);
      toast.success('¡Dirección guardada!');
    },
  });

  const validateCouponMutation = useMutation({
    mutationFn: async (code) => {
      const coupons = await base44.entities.Coupon.filter({ code: code.toUpperCase(), is_active: true });
      if (coupons.length === 0) throw new Error('Cupón no válido');
      
      const coupon = coupons[0];
      const now = new Date();
      
      if (coupon.starts_at && new Date(coupon.starts_at) > now) {
        throw new Error('Este cupón aún no está disponible');
      }
      if (coupon.expires_at && new Date(coupon.expires_at) < now) {
        throw new Error('Este cupón ha expirado');
      }
      
      // Si es específico de usuarios, validar asignación
      if (coupon.is_user_specific) {
        const assignments = await base44.entities.CouponAssignment.filter({
          coupon_id: coupon.id,
          user_email: user?.email
        });
        if (assignments.length === 0) {
          throw new Error('Este cupón no está disponible para tu cuenta');
        }
        const assignment = assignments[0];
        if (coupon.usage_limit_per_user && assignment.usage_count >= coupon.usage_limit_per_user) {
          throw new Error('Ya has usado este cupón el máximo de veces permitidas');
        }
      }
      
      if (coupon.minimum_order_amount && subtotal < coupon.minimum_order_amount) {
        throw new Error(`Compra mínima requerida: $${coupon.minimum_order_amount.toFixed(2)}`);
      }
      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
        throw new Error('Este cupón ya no está disponible');
      }
      
      return coupon;
    },
  });

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Ingresa un código de cupón');
      return;
    }
    
    setCouponError('');
    setValidatingCoupon(true);
    try {
      const coupon = await validateCouponMutation.mutateAsync(couponCode);
      setAppliedCoupon(coupon);
      setCouponCode('');
      toast.success('¡Cupón aplicado correctamente!');
    } catch (err) {
      const errorMsg = err.message || 'Error al validar cupón';
      setCouponError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

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

      // Crear la orden primero
      // Si pago con tarjeta, no limpiar el carrito hasta confirmar pago
      const res = await base44.functions.invoke('placeOrder', {
        cartItems: cleanedCartItems,
        shippingAddress,
        paymentMethod,
        couponCode: appliedCoupon?.code,
        skipCartClear: paymentMethod === 'credit_card' || paymentMethod === 'wompi',
      });

      if (res.data?.error) throw new Error(res.data.details?.join('\n') || res.data.error);
      const order = res.data.order;

      // Si pago con Wompi → mostrar widget embebido dentro de la app
      if (paymentMethod === 'wompi') {
        setShowWompiWidget(true);
        return order;
      }

      // Si pago con tarjeta → redirigir a Stripe
      if (paymentMethod === 'credit_card') {
        const stripeRes = await base44.functions.invoke('createStripeCheckout', {
          cartItems: cleanedCartItems,
          shippingAddress,
          couponCode: appliedCoupon?.code,
          discount,
          shipping,
          orderId: order.id,
          customerEmail: user?.email,
        });

        if (stripeRes.data?.error) throw new Error(stripeRes.data.error);
        if (stripeRes.data?.url) {
          // Si estamos en un iframe (preview), abrir en top level para evitar el bloqueo de Stripe
          if (window.self !== window.top) {
            window.top.location.href = stripeRes.data.url;
          } else {
            window.location.href = stripeRes.data.url;
          }
          return order;
        }
      }

      return order;
    },
    onSuccess: (order) => {
      // Solo llega aquí si no hubo redirección a Stripe (ej: cash_on_delivery)
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
                        <p className="text-sm font-medium text-foreground">
                          {addr.first_name} {addr.last_name} · {addr.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {addr.colonia}, {addr.street} {addr.house_number && `#${addr.house_number}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {addr.municipio}, {addr.departamento}
                        </p>
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
            <div className="mt-3">
              <AddressForm
                onSave={(data) => saveAddressMutation.mutate(data)}
                onCancel={() => setShowAddressForm(false)}
                isSaving={saveAddressMutation.isPending}
              />
            </div>
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
              { value: 'wompi', icon: Shield, label: 'Wompi', description: 'Pago seguro en línea con Wompi' },
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

        {/* Coupon */}
        <div className="bg-card rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Ticket className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Código de Cupón</h2>
          </div>
          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-success/10 border border-success rounded-lg p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{appliedCoupon.code}</p>
                <p className="text-xs text-muted-foreground">
                  {appliedCoupon.discount_type === 'percentage' 
                    ? `${appliedCoupon.discount_value}% descuento` 
                    : `$${appliedCoupon.discount_value.toFixed(2)} descuento`}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleRemoveCoupon} className="text-xs">
                Quitar
              </Button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Input
                  placeholder="Ingresa tu código"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                  disabled={validatingCoupon}
                  className="text-sm"
                />
                <Button
                  onClick={handleApplyCoupon}
                  disabled={validatingCoupon || !couponCode.trim()}
                  variant="outline"
                  className="px-3"
                >
                  {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
                </Button>
              </div>
              {couponError && (
                <p className="text-xs text-destructive mt-2">{couponError}</p>
              )}
            </>
          )}
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
            {discount > 0 && (
              <div className="flex justify-between text-sm text-success">
                <span>Descuento</span>
                <span>-${discount.toFixed(2)}</span>
              </div>
            )}
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

      {/* Wompi Widget Modal */}
      {showWompiWidget && (
        <WompiWidget
          urlPago="https://s.wompi.sv/1339589VDv"
          onClose={() => setShowWompiWidget(false)}
        />
      )}

      {/* Place Order */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border px-4 py-3 safe-area-bottom">
        {paymentMethod === 'cash_on_delivery' && (
          <p className="text-xs text-muted-foreground text-center mb-2">
            💵 Pagarás <span className="font-semibold text-foreground">${total.toFixed(2)}</span> al recibir tu pedido
          </p>
        )}
        {paymentMethod === 'credit_card' && (
          <p className="text-xs text-muted-foreground text-center mb-2">
            🔒 Pago seguro procesado por <span className="font-semibold text-foreground">Stripe</span>
          </p>
        )}
        {paymentMethod === 'wompi' && (
          <p className="text-xs text-muted-foreground text-center mb-2">
            🔒 Serás redirigido al portal de pago de <span className="font-semibold text-foreground">Wompi</span>
          </p>
        )}
        <Button
           onClick={() => placeOrderMutation.mutate()}
           disabled={placeOrderMutation.isPending || !selectedAddressId || !paymentMethod}
           className="w-full bg-primary text-primary-foreground font-bold h-12 rounded-full text-base max-w-lg mx-auto block"
         >
           {placeOrderMutation.isPending ? (
             <Loader2 className="w-5 h-5 animate-spin" />
           ) : paymentMethod === 'credit_card' ? (
             '💳 Pagar con Tarjeta'
           ) : paymentMethod === 'wompi' ? (
             '🛡️ Pagar con Wompi'
           ) : (
             'Finalizar Compra'
           )}
         </Button>
      </div>
    </div>
  );
}