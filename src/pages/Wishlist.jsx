import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Heart, ShoppingCart, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useCurrentUser } from '@/lib/useCurrentUser';

export default function Wishlist() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isGuest } = useCurrentUser();

  const { data: wishlistItems = [], isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => base44.entities.Wishlist.list(),
    enabled: !isGuest,
  });

  const removeMutation = useMutation({
    mutationFn: (id) => base44.entities.Wishlist.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success('Eliminado de favoritos');
    },
  });

  if (isGuest) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-8">
        <Heart className="w-16 h-16 text-muted-foreground/30" />
        <p className="text-muted-foreground text-center">Inicia sesión para ver tus favoritos</p>
        <Button onClick={() => base44.auth.redirectToLogin(window.location.href)} className="rounded-full">
          Iniciar sesión
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg flex items-center gap-3 px-4 safe-area-top border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2 bg-secondary rounded-full">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-base font-semibold text-foreground flex-1">Mis favoritos</h1>
        <span className="text-xs text-muted-foreground">{wishlistItems.length} {wishlistItems.length === 1 ? 'producto' : 'productos'}</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : wishlistItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 px-8">
          <Heart className="w-16 h-16 text-muted-foreground/30" />
          <p className="text-muted-foreground text-center">Aún no tienes productos guardados</p>
          <Button variant="outline" onClick={() => navigate(createPageUrl('Browse'))} className="rounded-full">
            Explorar productos
          </Button>
        </div>
      ) : (
        <div className="p-4 grid grid-cols-2 gap-3">
          {wishlistItems.map((item) => (
            <div key={item.id} className="bg-card rounded-2xl overflow-hidden border border-border">
              <div
                className="aspect-square overflow-hidden cursor-pointer"
                onClick={() => navigate(`${createPageUrl('ProductDetail')}?id=${item.product_id}`)}
              >
                <img
                  src={item.product_image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400'}
                  alt={item.product_name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3">
                <p
                  className="text-xs font-medium text-foreground line-clamp-2 mb-1 cursor-pointer"
                  onClick={() => navigate(`${createPageUrl('ProductDetail')}?id=${item.product_id}`)}
                >
                  {item.product_name}
                </p>
                <p className="text-sm font-bold text-primary mb-2">
                  ${item.product_price?.toFixed(2)}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 h-8 text-xs rounded-full"
                    onClick={() => navigate(`${createPageUrl('ProductDetail')}?id=${item.product_id}`)}
                  >
                    <ShoppingCart className="w-3 h-3 mr-1" />
                    Ver
                  </Button>
                  <button
                    onClick={() => removeMutation.mutate(item.id)}
                    disabled={removeMutation.isPending}
                    className="p-2 rounded-full bg-secondary text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}