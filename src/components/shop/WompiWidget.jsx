import React, { useEffect, useState } from 'react';
import { X, CreditCard, Loader2, Shield, CheckCircle2, ExternalLink } from 'lucide-react';
import { useBackButtonOverlay } from '@/hooks/useBackButtonClose';
import { base44 } from '@/api/base44Client';

/**
 * Pago con tarjeta (sin branding del proveedor).
 *
 * El formulario del proveedor no puede incrustarse de forma confiable dentro
 * de la app (bloquea iframes anidados), así que se abre el enlace de pago en
 * una ventana de primer nivel. Esta ventana mantiene el polling del estado de
 * la orden y avanza sola en cuanto el webhook la marca como pagada.
 */
export default function WompiWidget({ urlPago, onClose, total, loading, orderId, onSuccess }) {
  useBackButtonOverlay(true, onClose);
  const [verifying, setVerifying] = useState(false);
  const [opened, setOpened] = useState(false);

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

  const handleContinue = () => {
    if (!urlPago) return;
    const tab = window.open(urlPago, '_blank');
    if (!tab) {
      // WebViews que bloquean ventanas nuevas: navegar en la misma ventana
      window.location.assign(urlPago);
      return;
    }
    tab.opener = null;
    setOpened(true);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] flex flex-col">
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
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
            <p className="text-sm font-semibold text-gray-800">¡Pago recibido!</p>
            <p className="text-xs text-gray-500 mt-1">Confirmando tu orden...</p>
            <Loader2 className="w-5 h-5 animate-spin text-primary mt-3" />
          </div>
        ) : loading || !urlPago ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-gray-500">Preparando tu pago seguro...</p>
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
              <Shield className="w-3 h-3" />
              <span>Pago cifrado SSL</span>
            </div>
          </div>
        ) : (
          <div className="px-6 py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm font-semibold text-gray-800">Ingresa los datos de tu tarjeta</p>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Abriremos la pasarela de pago segura en otra ventana. Al terminar, regresa aquí: esta pantalla se actualizará sola.
            </p>

            <button
              onClick={handleContinue}
              className="w-full h-11 mt-5 rounded-full bg-primary text-white font-bold text-sm flex items-center justify-center gap-2"
            >
              {opened ? 'Volver a abrir el pago' : 'Continuar al pago'}
              <ExternalLink className="w-4 h-4" />
            </button>

            {opened && (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                <span>Esperando la confirmación del pago...</span>
              </div>
            )}

            <div className="flex items-center justify-center gap-1 mt-4 text-[11px] text-gray-400">
              <Shield className="w-3 h-3" />
              <span>Pago cifrado SSL · No guardamos los datos de tu tarjeta</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}