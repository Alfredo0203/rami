import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Star, X } from 'lucide-react';
import { formatDateTimeSV } from '@/lib/dateUtils';

export default function ReviewDetailModal({ review, onClose }) {
  const [imageIndex, setImageIndex] = useState(0);

  if (!review) return null;

  return (
    <Dialog open={!!review} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < review.rating ? 'fill-warning text-warning' : 'text-muted-foreground'}`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{review.reviewer_name || 'Anónimo'}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {review.created_date ? formatDateTimeSV(review.created_date) : ''}
            </span>
          </div>

          {/* Title */}
          {review.title && (
            <h3 className="text-sm font-semibold text-foreground">{review.title}</h3>
          )}

          {/* Body */}
          <p className="text-sm text-muted-foreground leading-relaxed">{review.body}</p>

          {/* Images */}
          {review.images && review.images.length > 0 && (
            <div>
              <p className="text-xs font-medium text-foreground mb-2">Fotos del cliente</p>
              {review.images.length === 1 ? (
                <img
                  src={review.images[0]}
                  alt="Foto del cliente"
                  className="w-full rounded-xl border border-border"
                />
              ) : (
                <div className="relative">
                  <img
                    src={review.images[imageIndex]}
                    alt={`Foto ${imageIndex + 1}`}
                    className="w-full rounded-xl border border-border"
                  />
                  {review.images.length > 1 && (
                    <>
                      <button
                        onClick={() => setImageIndex(prev => prev > 0 ? prev - 1 : review.images.length - 1)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                      >
                        ‹
                      </button>
                      <button
                        onClick={() => setImageIndex(prev => prev < review.images.length - 1 ? prev + 1 : 0)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                      >
                        ›
                      </button>
                      <div className="flex justify-center gap-1 mt-2">
                        {review.images.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setImageIndex(idx)}
                            className={`w-2 h-2 rounded-full transition-colors ${idx === imageIndex ? 'bg-primary' : 'bg-muted'}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Verified purchase badge */}
          {review.is_verified_purchase && (
            <div className="flex items-center gap-1 text-xs text-success">
              <Star className="w-3 h-3 fill-success" />
              <span>Compra verificada</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}