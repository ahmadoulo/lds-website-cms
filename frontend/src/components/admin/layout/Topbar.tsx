import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import { LogOut, UserCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export const Topbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Simple breadcrumb logic
  const pathParts = location.pathname.split('/').filter(p => p && p !== 'admin');
  const title = pathParts.length > 0 
    ? pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1)
    : 'Dashboard';

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold text-[#172642] font-montserrat tracking-tight">
          {title}
        </h1>
      </div>

      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2 text-sm">
          <UserCircle className="w-8 h-8 text-gray-400" />
          <div className="hidden md:block">
            <p className="font-medium text-gray-700 leading-none">{user?.firstName || 'Admin'} {user?.lastName || 'User'}</p>
            <p className="text-xs text-gray-500 mt-1">{user?.role || 'Administrator'}</p>
          </div>
        </div>
        
        <div className="h-6 w-px bg-gray-200"></div>
        
        <button 
          onClick={logout}
          className="flex items-center text-gray-500 hover:text-[#EE7900] transition-colors text-sm font-medium"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </button>
      </div>
    </header>
  );
};
