import React, { useEffect, useRef, useState } from 'react';
import { X, CreditCard, Loader2, Shield } from 'lucide-react';
import { useBackButtonOverlay } from '@/hooks/useBackButtonClose';

/**
 * Modal de pago con tarjeta (sin branding del proveedor).
 * Muestra "Pagar con Tarjeta" + el total mientras se prepara el widget,
 * luego inyecta el formulario de pago en el contenedor.
 */
export default function WompiWidget({ urlPago, onClose, total, loading }) {
  useBackButtonOverlay(true, onClose);
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !urlPago) return;

    containerRef.current.innerHTML = '';

    const div = document.createElement('div');
    div.className = 'wompi_button_widget';
    div.setAttribute('data-url-pago', urlPago);
    div.setAttribute('data-render', 'widget');
    div.setAttribute('data-cubrir-ancho', 'true');
    containerRef.current.appendChild(div);

    const tryInit = () => {
      if (window.WompiPagos && typeof window.WompiPagos.init === 'function') {
        window.WompiPagos.init();
        setReady(true);
        return true;
      }
      if (window.wompi && typeof window.wompi.init === 'function') {
        window.wompi.init();
        setReady(true);
        return true;
      }
      return false;
    };

    if (!tryInit()) {
      const existingScript = document.querySelector('script[src*="wompi.pagos.js"]');
      if (existingScript) {
        const newScript = document.createElement('script');
        newScript.src = existingScript.src;
        newScript.onload = () => {
          tryInit();
          setReady(true);
        };
        document.body.appendChild(newScript);
      } else {
        setReady(true);
      }
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [urlPago]);

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

        {/* Contenido: spinner mientras carga, widget cuando esté listo */}
        {loading || !urlPago ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm text-gray-500">Preparando tu pago seguro...</p>
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
              <Shield className="w-3 h-3" />
              <span>Pago cifrado SSL</span>
            </div>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 p-2" ref={containerRef} />
        )}
      </div>
    </div>
  );
}