import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const ProtectedRoute = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // If user must change password and is NOT currently on the change-password page, redirect them.
  if (user?.mustChangePassword && location.pathname !== '/admin/change-password') {
    return <Navigate to="/admin/change-password" replace />;
  }
  
  // Conversely, if they don't need to change password but try to access the change-password page, redirect to dashboard.
  if (!user?.mustChangePassword && location.pathname === '/admin/change-password') {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
};
