import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';

import { PublicLayout } from './components/layout/PublicLayout';
import { AdminLayout } from './components/admin/layout/AdminLayout';

import Home from './pages/public/Home';
import { AboutPage } from './pages/public/AboutPage';
import { ActionsPage } from './pages/public/ActionsPage';
import { ImpactPage } from './pages/public/ImpactPage';
import { PartnersPage } from './pages/public/PartnersPage';
import { SupportPage } from './pages/public/SupportPage';
import { ContactPage } from './pages/public/ContactPage';
import { NotFoundPage } from './pages/public/NotFoundPage';
import { News, NewsDetail } from './pages/public/News';
import { Gallery } from './pages/public/Gallery';

import { AdminLogin } from './pages/admin/AdminLogin';
import { ChangePasswordAdmin } from './pages/admin/ChangePasswordAdmin';
import { DashboardHome } from './pages/admin/DashboardHome';
import { SettingsAdmin } from './pages/admin/SettingsAdmin';
import { DonationsAdmin } from './pages/admin/DonationsAdmin';
import { NewsAdmin } from './pages/admin/NewsAdmin';
import { MissionsAdmin } from './pages/admin/MissionsAdmin';
import { ProtectedRoute } from './components/admin/ProtectedRoute';

// Create a client for React Query
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <AuthProvider>
          <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<PublicLayout />}>
              <Route index element={<Home />} />
              <Route path="a-propos" element={<AboutPage />} />
              <Route path="nos-actions" element={<ActionsPage />} />
              <Route path="impact" element={<ImpactPage />} />
              <Route path="partenaires" element={<PartnersPage />} />
              <Route path="nous-soutenir" element={<SupportPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="actualites" element={<News />} />
              <Route path="actualites/:slug" element={<NewsDetail />} />
              <Route path="galerie" element={<Gallery />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* Admin Login Route (Unprotected) */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Admin Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/admin/change-password" element={<ChangePasswordAdmin />} />
              
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<DashboardHome />} />
                <Route path="settings" element={<SettingsAdmin />} />
                <Route path="donations" element={<DonationsAdmin />} />
                <Route path="news" element={<NewsAdmin />} />
                <Route path="missions" element={<MissionsAdmin />} />
              </Route>
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

export default App;
