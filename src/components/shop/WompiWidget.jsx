import React, { useEffect, useState } from 'react';
import { X, CreditCard, Loader2, Shield, CheckCircle2, ExternalLink } from 'lucide-react';
import { useBackButtonOverlay } from '@/hooks/useBackButtonClose';
import { base44 } from '@/api/base44Client';

/**
 * Pago con tarjeta dentro de la app (sin branding del proveedor).
 *
 * El formulario se muestra incrustado en modo widget, que sí permite mostrarse
 * dentro de la app. Esta ventana mantiene el polling del estado de la orden y
 * avanza sola en cuanto el webhook la marca como pagada.
 */
export default function WompiWidget({ urlPago, fallbackUrl, onClose, total, loading, orderId, onSuccess }) {
  useBackButtonOverlay(true, onClose);
  const [verifying, setVerifying] = useState(false);

  // Polling del estado de la orden: cuando el webhook de Wompi la marque
  // como pagada, navegamos a la confirmación.
  useEffect(() => {
    if (!orderId || !onSuccess) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const order = await base44.entities.Order.get(orderId);
        if (cancelled) return;
        if (order?.payment_status === 'paid') {
          setVerifying(true);
          onSuccess(orderId);
          return;
        }
      } catch (e) {
        // la orden aún no está disponible — seguir intentando
      }
    };
    poll();
    const interval = setInterval(poll, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderId, onSuccess]);

  return (
    <div className="fixed inset-0 z-[9999] flex bg-black/60 p-0 sm:items-center sm:justify-center sm:p-4">
      <div className="bg-white w-full h-full sm:h-[88vh] sm:max-w-md sm:rounded-2xl flex flex-col overflow-hidden">
        {/* Header — sin branding del proveedor */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-semibold text-gray-800 text-sm block">Pagar con Tarjeta</span>
              {total && <span className="text-xs text-gray-500">Total: ${total}</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
            <span>Cancelar</span>
          </button>
        </div>

        {verifying ? (
          <div className="flex flex-col items-center justify-center flex-1 py-16 px-6">
            <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
            <p className="text-sm font-semibold text-gray-800">¡Pago recibido!</p>
            <p className="text-xs text-gray-500 mt-1">Confirmando tu orden...</p>
            <Loader2 className="w-5 h-5 animate-spin text-primary mt-3" />
          </div>
        ) : loading || !urlPago ? (
          <div className="flex flex-col items-center justify-center flex-1 py-16 px-6">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-gray-500">Preparando tu pago seguro...</p>
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
              <Shield className="w-3 h-3" />
              <span>Pago cifrado SSL</span>
            </div>
          </div>
        ) : (
          <>
            <iframe
              title="Formulario de pago"
              src={urlPago}
              allow="payment"
              className="flex-1 w-full min-h-0 border-0 bg-white"
            />
            <div className="flex items-center justify-between gap-2 px-4 py-2 border-t border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-1 text-[11px] text-gray-400">
                <Shield className="w-3 h-3" />
                <span>No guardamos los datos de tu tarjeta</span>
              </div>
              {fallbackUrl && (
                <a
                  href={fallbackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-gray-500 underline whitespace-nowrap"
                >
                  Abrir en otra ventana
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}