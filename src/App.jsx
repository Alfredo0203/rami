import React, { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { base44 } from '@/api/base44Client';
import { LanguageProvider } from '@/components/i18n/LanguageProvider';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import AdminSalesCharts from './pages/AdminSalesCharts';
import Policies from './pages/Policies';
import InventoryDashboard from './pages/InventoryDashboard';
import SellerDashboard from './pages/SellerDashboard';
import Recommendations from './pages/Recommendations';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const [authError, setAuthError] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Only check if user is "not_registered" — guests are allowed
    base44.auth.me()
      .then(() => setChecking(false))
      .catch((err) => {
        if (err?.message?.includes('not registered')) {
          setAuthError({ type: 'user_not_registered' });
        }
        setChecking(false);
      });
  }, []);

  if (checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // Render the main app (guest or authenticated)
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/AdminSalesCharts" element={<AdminSalesCharts />} />
      <Route path="/InventoryDashboard" element={<InventoryDashboard />} />
      <Route path="/SellerDashboard" element={<SellerDashboard />} />
      <Route path="/Recommendations" element={<LayoutWrapper currentPageName="Recommendations"><Recommendations /></LayoutWrapper>} />
      <Route path="/Policies" element={<Policies />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <SonnerToaster position="top-center" richColors />
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App