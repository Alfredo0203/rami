import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { X, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

function CheckoutForm({ onSuccess, onCancel, total }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError('');

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message);
      setProcessing(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
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
      <PaymentElement
        options={{
          layout: 'tabs',
          defaultValues: { billingDetails: {} },
          wallets: { applePay: 'never', googlePay: 'never' },
          fields: { billingDetails: { address: { country: 'never' } } },
        }}
      />
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
      <p className="text-xs text-center text-gray-400 flex items-center justify-center gap-1">
        <Lock className="w-3 h-3" /> Pago seguro procesado por Stripe
      </p>
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

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#635BFF] rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="font-semibold text-gray-800 text-sm">Pago con Tarjeta</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4">
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance,
              paymentMethodTypes: ['card'],
            }}
          >
            <CheckoutForm onSuccess={onSuccess} onCancel={onClose} total={total} />
          </Elements>
        </div>
      </div>
    </div>
  );
}