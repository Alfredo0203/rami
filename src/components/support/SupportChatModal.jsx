import React, { useState, useEffect } from 'react';
import { X, Send, MessageSquare, Phone, ChevronLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SupportChatModal({ isOpen, onClose }) {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [whatsappPhone, setWhatsappPhone] = useState('+50370000000');
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderSelection, setShowOrderSelection] = useState(false);
  const [currentTopic, setCurrentTopic] = useState(null);

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

  const handleShowOrders = async (topic) => {
    // Fetch orders for the current user
    const userOrders = await base44.entities.Order.filter({ customer_email: user?.email });
    setOrders(userOrders || []);
    setShowOrderSelection(true);
    setCurrentTopic(topic);
  };

  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    setLoading(true);
    try {
      // Construir mensaje con detalles del pedido si está seleccionado
      let fullMessage = `Hola, soy ${user?.full_name || 'Cliente'}. ${message}`;
      
      if (selectedOrder) {
        fullMessage += `\n\nPedido: ${selectedOrder.order_number}`;
        if (selectedOrder.tracking_number) {
          fullMessage += `\nRastreo: ${selectedOrder.tracking_number}`;
        }
        if (selectedOrder.status) {
          fullMessage += `\nEstado: ${selectedOrder.status}`;
        }
      }

      const messageText = encodeURIComponent(fullMessage);
      const whatsappUrl = `https://wa.me/${whatsappPhone.replace(/\D/g, '')}?text=${messageText}`;

      // Abrir WhatsApp en nueva ventana
      window.open(whatsappUrl, '_blank', 'width=500,height=600');

      // Limpiar y cerrar modal
      setMessage('');
      setSelectedOrder(null);
      setShowOrderSelection(false);
      setTimeout(() => onClose(), 1000);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickMessage = (preset) => {
    let fullMessage = preset;
    
    if (selectedOrder) {
      fullMessage += `\n\nPedido: ${selectedOrder.order_number}`;
      if (selectedOrder.tracking_number) {
        fullMessage += `\nRastreo: ${selectedOrder.tracking_number}`;
      }
    }

    const whatsappUrl = `https://wa.me/${whatsappPhone.replace(/\D/g, '')}?text=${encodeURIComponent(fullMessage)}`;
    window.open(whatsappUrl, '_blank', 'width=500,height=600');
    setSelectedOrder(null);
    setShowOrderSelection(false);
    setCurrentTopic(null);
    onClose();
  };

  if (!isOpen) return null;

  // Status labels in Spanish
  const statusLabels = {
    pending: 'Pendiente',
    processing: 'Procesando',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado'
  };

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
            {showOrderSelection ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <button onClick={() => { setShowOrderSelection(false); setCurrentTopic(null); setSelectedOrder(null); }} className="p-1 hover:bg-gray-100 rounded">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <p className="text-sm font-semibold text-gray-700">Selecciona un pedido (opcional)</p>
                </div>

                {orders.length === 0 ? (
                  <p className="text-sm text-gray-600 text-center py-4">No tienes pedidos registrados</p>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => handleQuickMessage(
                        currentTopic === 'delivery_time' ? '¿Cuál es el tiempo de entrega?' : 'Tengo una pregunta sobre mi pedido'
                      )}
                      className="w-full text-left p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition text-xs text-gray-600 font-medium"
                    >
                      Continuar sin seleccionar pedido
                    </button>
                    {orders.map(order => (
                      <button
                        key={order.id}
                        onClick={() => handleSelectOrder(order)}
                        className={`w-full text-left p-3 rounded-lg border transition text-sm ${
                          selectedOrder?.id === order.id
                            ? 'border-green-600 bg-green-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="font-medium text-gray-900">Pedido #{order.order_number}</div>
                        <div className="text-xs text-gray-600 mt-1">Total: ${order.total?.toFixed(2)}</div>
                        <div className="text-xs text-gray-600">Estado: {statusLabels[order.status] || order.status}</div>
                        {order.tracking_number && (
                          <div className="text-xs text-gray-600">Rastreo: {order.tracking_number}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-gray-700 mb-4">
                  Selecciona un tema o escribe tu mensaje:
                </p>

                {/* Quick messages */}
                <button
                  onClick={() => handleShowOrders('order_question')}
                  className="w-full text-left p-3 rounded-lg hover:bg-green-50 border border-gray-200 transition text-sm text-gray-700"
                >
                  📦 Pregunta sobre mi pedido
                </button>
                <button
                  onClick={() => handleShowOrders('delivery_time')}
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
          </>
          )}
          </div>

        {/* Input area */}
        <div className="border-t p-4 space-y-3 bg-gray-50">
          {selectedOrder && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-600 font-medium">Pedido seleccionado:</p>
              <p className="text-sm font-semibold text-blue-900">#{selectedOrder.order_number}</p>
              {selectedOrder.tracking_number && (
                <p className="text-xs text-blue-700">Rastreo: {selectedOrder.tracking_number}</p>
              )}
            </div>
          )}
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