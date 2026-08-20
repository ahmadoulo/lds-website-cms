import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './components/ui/Toast';
import { ScrollToTop } from './components/layout/ScrollToTop';
import { LoadingState } from './components/ui/States';

import { PublicLayout } from './components/layout/PublicLayout';
import Home from './pages/public/Home';
import { AboutPage } from './pages/public/AboutPage';
import { ActionsPage } from './pages/public/ActionsPage';
import { ImpactPage } from './pages/public/ImpactPage';
import { PartnersPage } from './pages/public/PartnersPage';
import { SupportPage } from './pages/public/SupportPage';
import { ContactPage } from './pages/public/ContactPage';
import { NotFoundPage } from './pages/public/NotFoundPage';
import { News } from './pages/public/News';
import { NewsDetail } from './pages/public/NewsDetail';
import { Gallery } from './pages/public/Gallery';

import { AdminLayout } from './components/admin/layout/AdminLayout';
import { ProtectedRoute } from './components/admin/ProtectedRoute';
// The administration is a separate chunk: public visitors never download it.
const AdminLogin = lazy(() =>
  import('./pages/admin/AdminLogin').then((m) => ({ default: m.AdminLogin })),
);
const ChangePasswordAdmin = lazy(() =>
  import('./pages/admin/ChangePasswordAdmin').then((m) => ({ default: m.ChangePasswordAdmin })),
);
const DashboardHome = lazy(() =>
  import('./pages/admin/DashboardHome').then((m) => ({ default: m.DashboardHome })),
);
const NewsAdmin = lazy(() =>
  import('./pages/admin/NewsAdmin').then((m) => ({ default: m.NewsAdmin })),
);
const MissionsAdmin = lazy(() =>
  import('./pages/admin/MissionsAdmin').then((m) => ({ default: m.MissionsAdmin })),
);
const GalleryAdmin = lazy(() =>
  import('./pages/admin/GalleryAdmin').then((m) => ({ default: m.GalleryAdmin })),
);
const MediaAdmin = lazy(() =>
  import('./pages/admin/MediaAdmin').then((m) => ({ default: m.MediaAdmin })),
);
const ImpactAdmin = lazy(() =>
  import('./pages/admin/ImpactAdmin').then((m) => ({ default: m.ImpactAdmin })),
);
const PartnersAdmin = lazy(() =>
  import('./pages/admin/PartnersAdmin').then((m) => ({ default: m.PartnersAdmin })),
);
const DonationsAdmin = lazy(() =>
  import('./pages/admin/DonationsAdmin').then((m) => ({ default: m.DonationsAdmin })),
);
const NavigationAdmin = lazy(() =>
  import('./pages/admin/NavigationAdmin').then((m) => ({ default: m.NavigationAdmin })),
);
const SettingsAdmin = lazy(() =>
  import('./pages/admin/SettingsAdmin').then((m) => ({ default: m.SettingsAdmin })),
);
const MessagesAdmin = lazy(() =>
  import('./pages/admin/MessagesAdmin').then((m) => ({ default: m.MessagesAdmin })),
);
const UsersAdmin = lazy(() =>
  import('./pages/admin/UsersAdmin').then((m) => ({ default: m.UsersAdmin })),
);
const AuditAdmin = lazy(() =>
  import('./pages/admin/AuditAdmin').then((m) => ({ default: m.AuditAdmin })),
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A 401/403/404 will not fix itself on retry; only transient failures are retried.
      retry: (failureCount, error: any) => {
        const status = error?.response?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

/** Shown while a lazily-loaded route chunk is being fetched. */
const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-warm">
    <LoadingState label="Chargement…" />
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ToastProvider>
          <SettingsProvider>
            <AuthProvider>
              <ScrollToTop />
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  {/* ------------------------------------------------ public */}
                  <Route element={<PublicLayout />}>
                    <Route index path="/" element={<Home />} />
                    <Route path="/a-propos" element={<AboutPage />} />
                    <Route path="/nos-actions" element={<ActionsPage />} />
                    <Route path="/actualites" element={<News />} />
                    <Route path="/actualites/:slug" element={<NewsDetail />} />
                    <Route path="/galerie" element={<Gallery />} />
                    <Route path="/impact" element={<ImpactPage />} />
                    <Route path="/partenaires" element={<PartnersPage />} />
                    <Route path="/nous-soutenir" element={<SupportPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>

                  {/* ------------------------------------------------- admin */}
                  <Route path="/admin/login" element={<AdminLogin />} />

                  <Route element={<ProtectedRoute />}>
                    <Route path="/admin/mot-de-passe" element={<ChangePasswordAdmin />} />

                    <Route path="/admin" element={<AdminLayout />}>
                      <Route index element={<DashboardHome />} />
                      <Route path="actualites" element={<NewsAdmin />} />
                      <Route path="missions" element={<MissionsAdmin />} />
                      <Route path="galerie" element={<GalleryAdmin />} />

                      {/* Site-wide configuration: administrators and above. */}
                      <Route element={<ProtectedRoute minRole="ADMIN" />}>
                        <Route path="medias" element={<MediaAdmin />} />
                        <Route path="impact" element={<ImpactAdmin />} />
                        <Route path="partenaires" element={<PartnersAdmin />} />
                        <Route path="soutien" element={<DonationsAdmin />} />
                        <Route path="navigation" element={<NavigationAdmin />} />
                        <Route path="parametres" element={<SettingsAdmin />} />
                        <Route path="messages" element={<MessagesAdmin />} />
                      </Route>

                      {/* Accounts and audit trail: super administrators only. */}
                      <Route element={<ProtectedRoute minRole="SUPER_ADMIN" />}>
                        <Route path="utilisateurs" element={<UsersAdmin />} />
                        <Route path="journal" element={<AuditAdmin />} />
                      </Route>

                      <Route path="*" element={<Navigate to="/admin" replace />} />
                    </Route>
                  </Route>
                </Routes>
              </Suspense>
            </AuthProvider>
          </SettingsProvider>
        </ToastProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
