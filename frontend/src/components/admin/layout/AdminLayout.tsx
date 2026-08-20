import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/api/axios';
import { useAuth } from '../../../context/AuthContext';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { can } = useAuth();

  // Powers the unread badge in the sidebar; editors cannot read messages.
  const { data: stats } = useQuery({
    queryKey: ['admin', 'dashboard', 'stats'],
    queryFn: async () => (await api.get('/dashboard/stats')).data,
    enabled: can('ADMIN'),
    refetchInterval: 1000 * 60 * 2,
  });

  return (
    <div className="flex h-screen overflow-hidden bg-warm-muted">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        unreadMessages={stats?.messages?.unread ?? 0}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
