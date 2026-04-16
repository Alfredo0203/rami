import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Eye, EyeOff, Trash2, Loader2, MessageSquare } from 'lucide-react';
import { formatDateTimeSV } from '@/lib/dateUtils';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function StarDisplay({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`w-3 h-3 ${s <= rating ? 'fill-warning text-warning' : 'text-muted-foreground/20'}`} />
      ))}
    </div>
  );
}

export default function AdminReviewsTab() {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState(null);
  const [filter, setFilter] = useState('all'); // all | approved | hidden

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: () => base44.entities.Review.list('-created_date'),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => base44.entities.Product.list(),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_approved }) => base44.entities.Review.update(id, { is_approved }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      toast.success('Reseña actualizada');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Review.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      setDeletingId(null);
      toast.success('Reseña eliminada');
    },
  });

  const productMap = Object.fromEntries(products.map(p => [p.id, p.name]));

  const filtered = reviews.filter(r => {
    if (filter === 'approved') return r.is_approved !== false;
    if (filter === 'hidden') return r.is_approved === false;
    return true;
  });

  return (
    <div className="space-y-3 mt-3 pb-6">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: `Todas (${reviews.length})` },
          { key: 'approved', label: `Visibles (${reviews.filter(r => r.is_approved !== false).length})` },
          { key: 'hidden', label: `Ocultas (${reviews.filter(r => r.is_approved === false).length})` },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === f.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary text-foreground border-border'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10">
          <MessageSquare className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No hay reseñas</p>
        </div>
      ) : (
        filtered.map(review => (
          <div
            key={review.id}
            className={`bg-card rounded-xl p-3 shadow-sm border ${
              review.is_approved === false ? 'border-destructive/20 opacity-60' : 'border-border'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <StarDisplay rating={review.rating} />
                  {review.is_verified_purchase && (
                    <span className="text-[10px] text-success font-medium">✓ Verificada</span>
                  )}
                  {review.is_approved === false && (
                    <span className="text-[10px] text-destructive font-medium bg-destructive/10 px-1.5 py-0.5 rounded-full">Oculta</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <span className="font-medium text-foreground">{review.reviewer_name || 'Anónimo'}</span>
                  {' · '}
                  {productMap[review.product_id] ? (
                    <span className="text-primary">{productMap[review.product_id]}</span>
                  ) : (
                    <span>Producto desconocido</span>
                  )}
                </p>
                {review.title && <p className="text-xs font-semibold text-foreground mt-1">{review.title}</p>}
                {review.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{review.body}</p>}
                {review.images?.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {review.images.map((url, i) => (
                      <img key={i} src={url} alt="" className="w-10 h-10 rounded-lg object-cover border border-border" />
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {review.created_date ? formatDateTimeSV(review.created_date) : ''}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  onClick={() => toggleMutation.mutate({ id: review.id, is_approved: review.is_approved === false })}
                  disabled={toggleMutation.isPending}
                  title={review.is_approved === false ? 'Mostrar reseña' : 'Ocultar reseña'}
                  className="p-2 bg-secondary rounded-lg hover:bg-muted transition-colors"
                >
                  {review.is_approved === false
                    ? <Eye className="w-3.5 h-3.5 text-success" />
                    : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                  }
                </button>
                <button
                  onClick={() => setDeletingId(review.id)}
                  className="p-2 bg-secondary rounded-lg hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      <AlertDialog open={!!deletingId} onOpenChange={(open) => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar reseña?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate(deletingId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}