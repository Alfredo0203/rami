import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, ThumbsUp, Camera, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

function StarRating({ value, onChange, readonly = false }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={readonly ? 'cursor-default' : 'cursor-pointer'}
        >
          <Star
            className={`w-5 h-5 transition-colors ${
              star <= (hover || value)
                ? 'fill-warning text-warning'
                : 'text-muted-foreground/30'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function ImageGallery({ images }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images?.length) return null;

  const next = () => setCurrentIndex((i) => (i + 1) % images.length);
  const prev = () => setCurrentIndex((i) => (i - 1 + images.length) % images.length);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setCurrentIndex(0)}>
      <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 text-white hover:bg-white/20 p-2 rounded-full">
        <ChevronLeft className="w-6 h-6" />
      </button>
      <img src={images[currentIndex]} alt="" className="max-h-[80vh] max-w-[80vw] object-contain rounded-lg" />
      <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-4 text-white hover:bg-white/20 p-2 rounded-full">
        <ChevronRight className="w-6 h-6" />
      </button>
      <span className="absolute bottom-4 text-white text-sm">{currentIndex + 1} / {images.length}</span>
    </div>
  );
}

function ReviewForm({ productId, onClose, hasPurchased }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState([]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (rating === 0) throw new Error('Selecciona una calificación');
      const user = await base44.auth.me();
      return base44.entities.Review.create({
        product_id: productId,
        rating,
        title: title.trim() || undefined,
        body: body.trim() || undefined,
        images,
        reviewer_name: user?.full_name || 'Anónimo',
        reviewer_email: user?.email,
        is_verified_purchase: hasPurchased,
        is_approved: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
      toast.success('¡Reseña publicada!');
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        files.map(file => base44.integrations.Core.UploadFile({ file }).then(r => r.file_url))
      );
      setImages(prev => [...prev, ...uploaded]);
    } catch {
      toast.error('Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-card rounded-2xl p-4 border border-border shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-foreground">Escribir reseña</h3>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-secondary">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Tu calificación *</p>
          <StarRating value={rating} onChange={setRating} />
        </div>

        <input
          type="text"
          placeholder="Título (opcional)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={80}
          className="w-full text-sm px-3 py-2 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />

        <textarea
          placeholder="Cuenta tu experiencia con el producto..."
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={3}
          className="w-full text-sm px-3 py-2 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />

        {/* Images */}
        <div>
          <div className="flex gap-2 flex-wrap">
            {images.map((url, i) => (
              <div key={i} className="relative w-16 h-16">
                <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                <button
                  onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center"
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            ))}
            {images.length < 4 && (
              <label className="w-16 h-16 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <Camera className="w-4 h-4 text-muted-foreground" />
                )}
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
              </label>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Máx. 4 fotos</p>
        </div>

        {hasPurchased && (
          <p className="text-[10px] text-success font-medium flex items-center gap-1">
            ✓ Compra verificada
          </p>
        )}

        <Button
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending || rating === 0}
          className="w-full bg-primary text-primary-foreground rounded-full h-10 text-sm"
        >
          {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publicar reseña'}
        </Button>
      </div>
    </motion.div>
  );
}

export default function ProductReviews({ productId, isGuest }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedImages, setSelectedImages] = useState(null);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['reviews', productId],
    queryFn: () =>
      base44.entities.Review.filter({ product_id: productId, is_approved: true }, '-created_date'),
    enabled: !!productId,
  });

  // Check if user has purchased this product
  const { data: hasPurchased = false } = useQuery({
    queryKey: ['has-purchased', productId],
    queryFn: async () => {
      const user = await base44.auth.me();
      const orders = await base44.entities.Order.filter({ customer_email: user.email });
      return orders.some(o =>
        o.status !== 'cancelled' &&
        o.items?.some(item => item.product_id === productId)
      );
    },
    enabled: !isGuest,
  });

  // Check if user already left a review
  const { data: userReview } = useQuery({
    queryKey: ['user-review', productId],
    queryFn: async () => {
      const user = await base44.auth.me();
      const existing = await base44.entities.Review.filter({
        product_id: productId,
        reviewer_email: user.email,
      });
      return existing[0] || null;
    },
    enabled: !isGuest,
  });

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
    : 0;

  const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => Math.round(r.rating) === star).length,
  }));

  return (
    <div className="px-4 pt-2 pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">
          Reseñas{reviews.length > 0 ? ` (${reviews.length})` : ''}
        </h2>
        {!isGuest && !userReview && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="text-xs text-primary font-semibold"
          >
            {showForm ? 'Cancelar' : '+ Escribir reseña'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <ReviewForm
            productId={productId}
            onClose={() => setShowForm(false)}
            hasPurchased={hasPurchased}
          />
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8">
          <Star className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Aún no hay reseñas</p>
          {!isGuest && !userReview && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 text-xs text-primary font-semibold"
            >
              ¡Sé el primero en opinar!
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="bg-secondary/50 rounded-2xl p-4 flex gap-4 items-center">
            <div className="text-center">
              <p className="text-4xl font-extrabold text-foreground">{avgRating.toFixed(1)}</p>
              <StarRating value={Math.round(avgRating)} readonly />
              <p className="text-[10px] text-muted-foreground mt-1">{reviews.length} reseñas</p>
            </div>
            <div className="flex-1 space-y-1">
              {ratingCounts.map(({ star, count }) => (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-2">{star}</span>
                  <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-warning rounded-full transition-all"
                      style={{ width: reviews.length > 0 ? `${(count / reviews.length) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-3">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Review list */}
          <div className="space-y-3">
            {reviews.map((review, i) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-card rounded-2xl p-4 border border-border"
              >
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{review.reviewer_name || 'Anónimo'}</p>
                    <StarRating value={review.rating} readonly />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">
                      {review.created_date ? format(new Date(review.created_date), 'dd MMM yyyy HH:mm') : ''}
                    </p>
                    {review.is_verified_purchase && (
                      <span className="text-[10px] text-success font-medium">✓ Verificada</span>
                    )}
                  </div>
                </div>

                {review.title && (
                  <p className="text-xs font-semibold text-foreground mt-1">{review.title}</p>
                )}
                {review.body && (
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{review.body}</p>
                )}

                {review.images?.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {review.images.map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImages(review.images)}
                        className="relative w-16 h-16 rounded-lg overflow-hidden border border-border hover:opacity-75 transition-opacity"
                      >
                        <img
                          src={url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </>
      )}

      {selectedImages && <ImageGallery images={selectedImages} />}
    </div>
  );
}