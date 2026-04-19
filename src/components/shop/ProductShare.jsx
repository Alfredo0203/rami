import React from 'react';
import { MessageCircle } from 'lucide-react';

export default function ProductShareButton({ product, productUrl }) {
  const productName = product?.name || 'Producto';
  const productPrice = product?.price ? `$${product.price.toFixed(2)}` : '';
  const shareMessage = `Mira este producto: ${productName} ${productPrice} ${productUrl}`;

  const handleShareWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <button
      onClick={handleShareWhatsApp}
      className="p-2 bg-secondary rounded-full"
      title="Compartir por WhatsApp"
    >
      <MessageCircle className="w-5 h-5 text-foreground" />
    </button>
  );
}