import React from 'react';
import { X, Shield, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Modal de confirmación antes de redirigir al portal de pago de Wompi.
 */
export default function WompiWidget({ urlPago, onClose, total }) {
  const handlePagar = () => {
    if (window.self !== window.top) {
      window.top.location.href = urlPago;
    } else {
      window.location.href = urlPago;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl w-full sm:max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#6C3CE1] rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">W</span>
            </div>
            <span className="font-semibold text-gray-800 text-sm">Pagar con Wompi</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-[#6C3CE1]/10 rounded-full flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-[#6C3CE1]" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-base">Pago seguro con Wompi</p>
            <p className="text-sm text-gray-500 mt-1">
              Serás redirigido al portal de Wompi para completar tu pago de forma segura.
            </p>
            {total && (
              <p className="text-lg font-bold text-gray-900 mt-3">${total}</p>
            )}
          </div>
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
            <ExternalLink className="w-3 h-3" />
            Se abrirá el portal de pagos de Wompi
          </p>
        </div>

        {/* Acciones */}
        <div className="px-4 pb-4 space-y-2">
          <Button
            onClick={handlePagar}
            className="w-full bg-[#6C3CE1] hover:bg-[#5a32c4] text-white font-semibold h-11 rounded-xl"
          >
            Continuar al pago
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full h-10 text-gray-500 rounded-xl"
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}