import React from 'react';
import { Share2 } from 'lucide-react';

export default function ProductShareButton({ product, productUrl }) {
  const productName = product?.name || 'Producto';
  const productPrice = product?.price ? `$${product.price.toFixed(2)}` : '';
  const shareMessage = `Mira este producto: ${productName} ${productPrice} ${productUrl}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: productName,
          text: shareMessage,
          url: productUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          navigator.clipboard.writeText(productUrl);
        }
      }
    } else {
      navigator.clipboard.writeText(productUrl);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="p-2 bg-secondary rounded-full touch-manipulation"
      title="Compartir"
    >
      <Share2 className="w-5 h-5 text-foreground pointer-events-none" />
    </button>
  );
}