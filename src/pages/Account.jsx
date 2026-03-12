import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BottomNav from '../components/shop/BottomNav';
import { useQuery } from '@tanstack/react-query';
import { User, Package, MapPin, LogOut, ChevronRight, Shield, Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';

export default function Account() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(setUser)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart'],
    queryFn: () => base44.entities.CartItem.list(),
  });

  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  const menuItems = [
    { icon: Package, label: 'My Orders', page: 'Orders' },
    { icon: MapPin, label: 'My Addresses', page: 'Addresses' },
  ];

  if (user?.role === 'admin') {
    menuItems.push({ icon: Shield, label: 'Admin Panel', page: 'Admin' });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Profile header */}
      <div className="px-4 pt-8 pb-6" style={{ background: 'linear-gradient(135deg, hsl(14 100% 55%), hsl(340 82% 52%))' }}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary-foreground/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary-foreground">{user?.full_name || 'Guest User'}</h1>
            <p className="text-sm text-primary-foreground/70">{user?.email || ''}</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="px-4 -mt-3">
        <div className="bg-card rounded-xl shadow-sm overflow-hidden">
          {menuItems.map((item, i) => (
            <button
              key={i}
              onClick={() => navigate(createPageUrl(item.page))}
              className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors border-b border-border last:border-b-0"
            >
              <item.icon className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-foreground flex-1 text-left">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        <button
          onClick={() => base44.auth.logout()}
          className="w-full flex items-center gap-3 p-4 mt-4 bg-card rounded-xl shadow-sm hover:bg-secondary/50 transition-colors"
        >
          <LogOut className="w-5 h-5 text-destructive" />
          <span className="text-sm font-medium text-destructive">Sign Out</span>
        </button>
      </div>

      <BottomNav cartCount={cartCount} />
    </div>
  );
}