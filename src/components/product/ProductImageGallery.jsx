import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600';

export default function ProductImageGallery({ images = [], discount = 0 }) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef(null);
  const displayImages = images.length > 0 ? images : [PLACEHOLDER];

  // Reset to first when image set changes (e.g. color change)
  useEffect(() => { setCurrent(0); }, [images.join(',')]);

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) setCurrent(i => Math.min(i + 1, displayImages.length - 1));
    else setCurrent(i => Math.max(i - 1, 0));
  };

  return (
    <div>
      {/* Main image */}
      <div
        className="relative aspect-square bg-card overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={current + displayImages[current]}
            src={displayImages[current]}
            alt="product"
            className="w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
        </AnimatePresence>

        {displayImages.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {displayImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all ${i === current ? 'bg-primary w-5' : 'bg-white/60 w-2'}`}
              />
            ))}
          </div>
        )}

        {discount > 0 && (
          <div className="absolute top-3 left-3 bg-sale text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
            -{discount}% OFF
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {displayImages.length > 1 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto hide-scrollbar">
          {displayImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                i === current ? 'border-primary' : 'border-transparent opacity-70'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}