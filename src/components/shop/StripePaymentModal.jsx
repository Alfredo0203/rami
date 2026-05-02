import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Íconos SVG de marcas de tarjeta
const CardBrandIcons = () => (
  <div className="flex items-center gap-2 flex-wrap">
    {/* Visa */}
    <svg viewBox="0 0 48 30" className="h-6 w-auto" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="30" rx="4" fill="#1A1F71"/>
      <text x="7" y="22" fontFamily="Arial" fontWeight="bold" fontSize="14" fill="white" letterSpacing="1">VISA</text>
    </svg>
    {/* Mastercard */}
    <svg viewBox="0 0 48 30" className="h-6 w-auto" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="30" rx="4" fill="#252525"/>
      <circle cx="18" cy="15" r="9" fill="#EB001B"/>
      <circle cx="30" cy="15" r="9" fill="#F79E1B"/>
      <path d="M24 8.3a9 9 0 0 1 0 13.4A9 9 0 0 1 24 8.3z" fill="#FF5F00"/>
    </svg>
    {/* Amex */}
    <svg viewBox="0 0 48 30" className="h-6 w-auto" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="30" rx="4" fill="#2557D6"/>
      <text x="4" y="20" fontFamily="Arial" fontWeight="bold" fontSize="9" fill="white">AMERICAN</text>
      <text x="4" y="28" fontFamily="Arial" fontWeight="bold" fontSize="9" fill="white">EXPRESS</text>
    </svg>
    {/* Discover */}
    <svg viewBox="0 0 48 30" className="h-6 w-auto" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="30" rx="4" fill="#F5F5F5" stroke="#e5e7eb" strokeWidth="0.5"/>
      <circle cx="32" cy="15" r="10" fill="#F76F20"/>
      <text x="5" y="19" fontFamily="Arial" fontWeight="bold" fontSize="7" fill="#231F20">DISCOVER</text>
    </svg>
  </div>
);

const CARD_ELEMENT_OPTIONS = {
  disableLink: true,
  style: {
    base: {
      fontSize: '16px',
      color: '#1a1a1a',
      fontFamily: 'Inter, system-ui, sans-serif',
      '::placeholder': { color: '#9ca3af' },
    },
    invalid: { color: '#ef4444' },
  },
};

function CheckoutForm({ onSuccess, onCancel, total, clientSecret }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError('');

    const cardElement = elements.getElement(CardNumberElement);

    const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement },
    });

    if (confirmError) {
      setError(confirmError.message);
      setProcessing(false);
    } else if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Marcas aceptadas */}
      <CardBrandIcons />

      {/* Número de tarjeta */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-600">Número de tarjeta</label>
        <div className="border border-gray-200 rounded-lg px-3 py-3 bg-white focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all">
          <CardNumberElement options={CARD_ELEMENT_OPTIONS} />
        </div>
      </div>

      {/* Expiración + CVC */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Vencimiento</label>
          <div className="border border-gray-200 rounded-lg px-3 py-3 bg-white focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all">
            <CardExpiryElement options={CARD_ELEMENT_OPTIONS} />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">CVC</label>
          <div className="border border-gray-200 rounded-lg px-3 py-3 bg-white focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all">
            <CardCvcElement options={CARD_ELEMENT_OPTIONS} />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={processing}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1 bg-primary text-primary-foreground font-bold h-11"
        >
          {processing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            `Pagar $${total}`
          )}
        </Button>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
        <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
        <span>Pago seguro con cifrado SSL · Estándar PCI DSS</span>
      </div>
    </form>
  );
}

export default function StripePaymentModal({ clientSecret, publishableKey, total, onSuccess, onClose }) {
  if (!clientSecret || !publishableKey) return null;

  const stripePromise = loadStripe(publishableKey);

  const appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: 'hsl(210, 85%, 58%)',
      borderRadius: '10px',
      fontFamily: 'Inter, system-ui, sans-serif',
    },
  };

  const elementsOptions = {
    clientSecret,
    appearance,
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center">
              <Lock className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-gray-800 text-sm">Pago con Tarjeta</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4">
          <Elements stripe={stripePromise} options={elementsOptions}>
            <CheckoutForm onSuccess={onSuccess} onCancel={onClose} total={total} clientSecret={clientSecret} />
          </Elements>
        </div>
      </div>
    </div>
  );
}