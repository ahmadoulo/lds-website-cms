import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Settings, 
  Menu, 
  Target, 
  Images, 
  Newspaper, 
  Users, 
  BarChart, 
  HeartHandshake, 
  Image as ImageIcon,
  ShieldCheck,
  Building
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs: (string | undefined | null | false)[]) => twMerge(clsx(inputs));

export const Sidebar = () => {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Missions', href: '/admin/missions', icon: Target },
    { name: 'News', href: '/admin/news', icon: Newspaper },
    { name: 'Gallery', href: '/admin/gallery', icon: Images },
    { name: 'Media Library', href: '/admin/media', icon: ImageIcon },
    { name: 'Impact Stats', href: '/admin/impact', icon: BarChart },
    { name: 'Partners', href: '/admin/partners', icon: Building },
    { name: 'Donations', href: '/admin/donations', icon: HeartHandshake },
    { name: 'Navigation', href: '/admin/navigation', icon: Menu },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Audit Logs', href: '/admin/audit-logs', icon: ShieldCheck },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#172642] text-white flex-shrink-0 flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <span className="text-lg font-bold font-montserrat text-white tracking-wide">
          LDS <span className="text-[#87CE18]">CMS</span>
        </span>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href || (item.href !== '/admin' && location.pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                isActive 
                  ? "bg-[#00A4DE] text-white shadow-sm" 
                  : "text-gray-300 hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon 
                className={cn(
                  "mr-3 flex-shrink-0 h-5 w-5 transition-colors",
                  isActive ? "text-white" : "text-gray-400 group-hover:text-white"
                )} 
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
