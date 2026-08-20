import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, type Role } from '../../context/AuthContext';
import { LoadingState } from '../ui/States';
import { EmptyState } from '../ui/States';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  /** Minimum role required to view the nested routes. */
  minRole?: Role;
}

/**
 * Gate in front of every admin route. The API enforces the same rules; this only
 * keeps the interface honest and avoids rendering pages that would 403.
 */
export const ProtectedRoute = ({ minRole }: ProtectedRouteProps) => {
  const { isAuthenticated, isBootstrapping, user, can } = useAuth();
  const location = useLocation();

  // The stored token is still being validated against /auth/me.
  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-warm">
        <LoadingState label="Vérification de la session…" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // A freshly created account must choose its own password before anything else.
  if (user?.mustChangePassword && location.pathname !== '/admin/mot-de-passe') {
    return <Navigate to="/admin/mot-de-passe" replace />;
  }

  if (minRole && !can(minRole)) {
    return (
      <div className="py-6">
        <EmptyState
          icon={ShieldAlert}
          title="Accès non autorisé"
          description="Votre rôle ne vous permet pas de consulter cette page. Contactez un administrateur si vous pensez qu'il s'agit d'une erreur."
        />
      </div>
    );
  }

  return <Outlet />;
};
