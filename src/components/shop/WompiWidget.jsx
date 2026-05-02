import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

/**
 * Renderiza el widget de cobro de Wompi inline dentro de la app.
 * El script de Wompi ya está cargado en index.html.
 * Se usa un div con clase wompi_button_widget y data-render="widget"
 * para que Wompi inyecte el formulario de pago directamente.
 */
export default function WompiWidget({ urlPago, onClose }) {
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !urlPago) return;

    // Limpiar contenido previo
    containerRef.current.innerHTML = '';

    // Crear el div que Wompi necesita
    const div = document.createElement('div');
    div.className = 'wompi_button_widget';
    div.setAttribute('data-url-pago', urlPago);
    div.setAttribute('data-render', 'widget');
    div.setAttribute('data-cubrir-ancho', 'true');
    containerRef.current.appendChild(div);

    // Intentar inicializar el widget de Wompi
    // El script expone window.WompiPagos o se auto-inicializa vía MutationObserver
    const tryInit = () => {
      if (window.WompiPagos && typeof window.WompiPagos.init === 'function') {
        window.WompiPagos.init();
        setReady(true);
        return true;
      }
      // Algunos builds exponen window.wompi
      if (window.wompi && typeof window.wompi.init === 'function') {
        window.wompi.init();
        setReady(true);
        return true;
      }
      return false;
    };

    if (!tryInit()) {
      // Si el script aún no terminó de inicializarse, recargar el script
      const existingScript = document.querySelector('script[src*="wompi.pagos.js"]');
      if (existingScript) {
        // Forzar re-ejecución clonando el script
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
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#6C3CE1] rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">W</span>
            </div>
            <span className="font-semibold text-gray-800 text-sm">Pagar con Wompi</span>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
            <span>Cancelar</span>
          </button>
        </div>

        {/* Widget container — Wompi inyecta aquí */}
        <div className="overflow-y-auto flex-1 p-2" ref={containerRef} />
      </div>
    </div>
  );
}