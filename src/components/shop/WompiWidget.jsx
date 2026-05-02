import React, { useEffect, useRef } from 'react';

/**
 * Renders the Wompi payment widget inline (data-render="widget")
 * The widget shows the payment form inside the page without redirecting.
 */
export default function WompiWidget({ urlPago, onClose }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !urlPago) return;

    // Clear previous renders
    containerRef.current.innerHTML = '';

    // Create the Wompi div element
    const div = document.createElement('div');
    div.className = 'wompi_button_widget';
    div.dataset.urlPago = urlPago;
    div.dataset.render = 'widget';
    div.dataset.cubrirAncho = 'true';
    containerRef.current.appendChild(div);

    // Re-run the Wompi script to pick up the new element
    const script = document.createElement('script');
    script.src = 'https://pagos.wompi.sv/js/wompi.pagos.js';
    script.async = true;
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [urlPago]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#6C3CE1] rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">W</span>
            </div>
            <span className="font-semibold text-gray-800">Pagar con Wompi</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
          >
            ×
          </button>
        </div>

        {/* Widget container */}
        <div className="p-4" ref={containerRef} />
      </div>
    </div>
  );
}