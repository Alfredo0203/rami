import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
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

  if (target) {
    return <Navigate to={target} replace />;
  }

  return <PageNotFound />;
}