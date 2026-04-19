import React, { useState } from 'react';
import { Share2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductShareButton({ product, productUrl }) {
  const [open, setOpen] = useState(false);

  const productName = product?.name || 'Producto';
  const productPrice = product?.price ? `$${product.price.toFixed(2)}` : '';
  const shareMessage = `Mira este producto: ${productName} ${productPrice} ${productUrl}`;

  const handleShareWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(whatsappUrl, '_blank');
    setOpen(false);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: productName,
          text: `Mira este producto: ${productName} ${productPrice}`,
          url: productUrl,
        });
        setOpen(false);
      } catch (err) {
        if (err.name !== 'AbortError') {
          toast.error('Error al compartir');
        }
      }
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 bg-secondary rounded-full"
        title="Compartir"
      >
        <Share2 className="w-5 h-5 text-foreground" />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 bg-card border border-border rounded-lg shadow-lg p-2 z-50 min-w-max">
          <button
            onClick={handleShareWhatsApp}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary rounded-md transition-colors text-sm"
          >
            <MessageCircle className="w-4 h-4 text-success" />
            <span>Compartir por WhatsApp</span>
          </button>
          {navigator.share && (
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary rounded-md transition-colors text-sm"
            >
              <Share2 className="w-4 h-4" />
              <span>Más opciones</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}