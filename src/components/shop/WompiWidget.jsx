import React from 'react';
import { X } from 'lucide-react';

/**
 * Muestra el portal de pago de Wompi dentro de un iframe modal.
 * Al cancelar, se llama onClose() y el usuario regresa al Checkout.
 */
export default function WompiWidget({ urlPago, onClose }) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black/70">
      {/* Header */}
      <div className="flex items-center justify-between bg-white px-4 py-3 shadow-md">
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
          Cancelar
        </button>
      </div>

      {/* Iframe */}
      <iframe
        src={urlPago}
        className="flex-1 w-full border-0"
        title="Pago Wompi"
        allow="payment"
      />
    </div>
  );
}