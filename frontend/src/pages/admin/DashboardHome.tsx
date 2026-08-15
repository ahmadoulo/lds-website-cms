import React from 'react';
import { Target, Users, Image as ImageIcon, MessageSquare, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api/axios';

export const DashboardHome = () => {
  const { token, user } = useAuth();
  
  const { data: rawStats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const res = await api.get('/dashboard/stats');
      return res.data;
    },
    enabled: !!token
  });

  const stats = [
    { label: 'Total Missions', value: rawStats?.missions ?? '-', icon: Target, color: 'bg-blue-100 text-blue-600', link: '/admin/missions' },
    { label: 'Partenaires', value: rawStats?.partners ?? '-', icon: Users, color: 'bg-green-100 text-green-600', link: '/admin/partners' },
    { label: 'Images Galerie', value: rawStats?.gallery ?? '-', icon: ImageIcon, color: 'bg-purple-100 text-purple-600', link: '/admin/gallery' },
    { label: 'Messages (Non lus)', value: rawStats?.unreadMessages ?? '-', icon: MessageSquare, color: 'bg-orange-100 text-orange-600', link: '/admin/contact' },
  ];

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-[#172642] rounded-2xl p-8 text-white flex justify-between items-center shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold font-montserrat">Bienvenue, {user?.firstName} !</h2>
          <p className="text-gray-300 mt-2 max-w-xl">
            Voici un aperçu de votre contenu. Sélectionnez un module dans le menu pour commencer à gérer le site.
          </p>
        </div>
        
        {/* Abstract decoration */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-[#00A4DE] rounded-full opacity-20 -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute right-10 bottom-0 w-40 h-40 bg-[#87CE18] rounded-full opacity-20 translate-y-1/2"></div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between group">
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <div className="flex items-center gap-2 mt-2">
                {isLoading ? (
                  <div className="h-8 w-12 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  <p className="text-3xl font-bold text-[#172642]">{stat.value}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end justify-between h-full space-y-4">
              <div className={`p-3 rounded-xl ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <Link to={stat.link} className="text-gray-400 hover:text-[#00A4DE] transition-colors">
                <ArrowUpRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
