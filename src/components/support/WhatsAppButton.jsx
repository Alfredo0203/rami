import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import SupportChatModal from './SupportChatModal';

export default function WhatsAppButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then(setIsAuthenticated);
  }, []);

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-110"
        aria-label="Chat de soporte"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Modal de chat */}
      <SupportChatModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}