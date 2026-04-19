import React, { useState, useEffect } from 'react';
import { X, Send, MessageSquare, Phone } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SupportChatModal({ isOpen, onClose }) {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('+50370000000');

  useEffect(() => {
    if (isOpen) {
      base44.auth.me().then(setUser);
      // Fetch WhatsApp number from settings
      base44.entities.AppSettings.filter({ key: 'global' })
        .then(results => {
          if (results[0]?.whatsapp_phone) {
            setWhatsappPhone(results[0].whatsapp_phone);
          }
        });
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    setLoading(true);
    try {
      // Generar URL de WhatsApp con el mensaje pre-llenado
      const messageText = encodeURIComponent(
        `Hola, soy ${user?.full_name || 'Cliente'}. ${message}`
      );
      const whatsappUrl = `https://wa.me/${whatsappPhone.replace(/\D/g, '')}?text=${messageText}`;

      // Abrir WhatsApp en nueva ventana
      window.open(whatsappUrl, '_blank', 'width=500,height=600');

      // Limpiar y cerrar modal
      setMessage('');
      setTimeout(() => onClose(), 1000);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickMessage = (preset) => {
    const whatsappUrl = `https://wa.me/${whatsappPhone.replace(/\D/g, '')}?text=${encodeURIComponent(preset)}`;
    window.open(whatsappUrl, '_blank', 'width=500,height=600');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-end md:justify-center p-0 md:p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-t-2xl md:rounded-2xl w-full md:w-96 max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-green-50">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-green-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Chat de Soporte</h3>
              <p className="text-xs text-gray-600">Chatea con nosotros en WhatsApp</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-sm text-gray-700 mb-4">
            Selecciona un tema o escribe tu mensaje:
          </p>

          {/* Quick messages */}
          <button
            onClick={() => handleQuickMessage('Tengo una pregunta sobre mi pedido')}
            className="w-full text-left p-3 rounded-lg hover:bg-green-50 border border-gray-200 transition text-sm text-gray-700"
          >
            📦 Pregunta sobre mi pedido
          </button>
          <button
            onClick={() => handleQuickMessage('¿Cuál es el tiempo de entrega?')}
            className="w-full text-left p-3 rounded-lg hover:bg-green-50 border border-gray-200 transition text-sm text-gray-700"
          >
            🚚 Tiempo de entrega
          </button>
          <button
            onClick={() => handleQuickMessage('Tengo un problema con mi producto')}
            className="w-full text-left p-3 rounded-lg hover:bg-green-50 border border-gray-200 transition text-sm text-gray-700"
          >
            ⚠️ Problema con producto
          </button>
          <button
            onClick={() => handleQuickMessage('Tengo una sugerencia')}
            className="w-full text-left p-3 rounded-lg hover:bg-green-50 border border-gray-200 transition text-sm text-gray-700"
          >
            💡 Sugerencia
          </button>
        </div>

        {/* Input area */}
        <div className="border-t p-4 space-y-3 bg-gray-50">
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Escribe tu mensaje..."
              disabled={loading}
              className="text-sm"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || loading}
              size="icon"
              className="bg-green-600 hover:bg-green-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {/* Direct call option */}
           <a
             href={`https://wa.me/${whatsappPhone.replace(/\D/g, '')}`}
             target="_blank"
             rel="noopener noreferrer"
             className="flex items-center justify-center gap-2 w-full p-2 bg-white border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition text-sm font-medium"
           >
            <Phone className="w-4 h-4" />
            Llamar directo a WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}