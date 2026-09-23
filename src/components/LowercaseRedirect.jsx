import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PageNotFound from '@/lib/PageNotFound';

// Map of lowercase path -> correct-case path for all app routes.
// Prevents Google Soft 404 classification when lowercase URLs are crawled.
const LOWERCASE_MAP = {
  '/home': '/',
  '/account': '/Account',
  '/addresses': '/Addresses',
  '/admin': '/Admin',
  '/browse': '/Browse',
  '/cart': '/Cart',
  '/checkout': '/Checkout',
  '/orderconfirmation': '/OrderConfirmation',
  '/orderdetail': '/OrderDetail',
  '/orders': '/Orders',
  '/productdetail': '/ProductDetail',
  '/wishlist': '/Wishlist',
  '/adminsalescharts': '/AdminSalesCharts',
  '/inventorydashboard': '/InventoryDashboard',
  '/sellerdashboard': '/SellerDashboard',
  '/recommendations': '/Recommendations',
  '/policies': '/Policies',
  '/privacypolicy': '/privacy-policy',
  '/login': '/Login',
};

export default function LowercaseRedirect() {
  const location = useLocation();
  const lowercasePath = location.pathname.toLowerCase();
  const target = LOWERCASE_MAP[lowercasePath];

  useEffect(() => {
    if (target) {
      // Hard redirect — Googlebot follows this like a real redirect
      window.location.replace(target);
    }
  }, [target]);

  if (target) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return <PageNotFound />;
}