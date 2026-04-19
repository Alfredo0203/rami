import React from 'react';
import { Share2, MessageCircle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

export default function ProductShare({ product, productUrl }) {
  const [copied, setCopied] = useState(false);

  const productName = product?.name || 'Producto';
  const productPrice = product?.price ? `$${product.price.toFixed(2)}` : '';
  const shareMessage = `Mira este producto: ${productName} ${productPrice} ${productUrl}`;

  const handleShareWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(productUrl).then(() => {
      setCopied(true);
      toast.success('Link copiado al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: productName,
          text: `Mira este producto: ${productName} ${productPrice}`,
          url: productUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          toast.error('Error al compartir');
        }
      }
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleShareWhatsApp}
        className="flex-1 flex items-center justify-center gap-2 bg-success text-white px-4 py-2.5 rounded-full font-medium text-sm hover:bg-success/90 transition-colors"
        title="Compartir por WhatsApp"
      >
        <MessageCircle className="w-4 h-4" />
        <span className="hidden sm:inline">WhatsApp</span>
      </button>

      <button
        onClick={handleCopyLink}
        className="flex items-center justify-center gap-2 bg-secondary text-foreground px-4 py-2.5 rounded-full font-medium text-sm hover:bg-secondary/80 transition-colors"
        title="Copiar link"
      >
        {copied ? (
          <Check className="w-4 h-4 text-success" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">{copied ? 'Copiado' : 'Link'}</span>
      </button>

      {navigator.share && (
        <button
          onClick={handleNativeShare}
          className="flex items-center justify-center gap-2 bg-secondary text-foreground px-4 py-2.5 rounded-full font-medium text-sm hover:bg-secondary/80 transition-colors"
          title="Compartir"
        >
          <Share2 className="w-4 h-4" />
          <span className="hidden sm:inline">Compartir</span>
        </button>
      )}
    </div>
  );
}