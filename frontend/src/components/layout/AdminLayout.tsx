import { Outlet, Link } from 'react-router-dom';
import { LayoutDashboard, Image, FileText, Settings, Users, LogOut } from 'lucide-react';

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-warm-muted flex font-montserrat">
      {/* Sidebar */}
      <aside className="w-64 bg-navy text-white flex flex-col">
        <div className="p-6">
          <div className="font-extrabold text-2xl tracking-tight">LDS Admin</div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1">
          <Link to="/admin" className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-xl text-sm font-semibold">
            <LayoutDashboard size={18} /> Dashboard
          </Link>
          
          <div className="pt-6 pb-2 px-4 text-xs font-bold text-white/50 tracking-wider">CONTENU</div>
          <Link to="/admin/missions" className="flex items-center gap-3 px-4 py-2.5 text-white/70 hover:bg-white/5 rounded-xl text-sm font-semibold transition-colors">
            <FileText size={18} /> Missions
          </Link>
          <Link to="/admin/gallery" className="flex items-center gap-3 px-4 py-2.5 text-white/70 hover:bg-white/5 rounded-xl text-sm font-semibold transition-colors">
            <Image size={18} /> Galerie
          </Link>
          <Link to="/admin/news" className="flex items-center gap-3 px-4 py-2.5 text-white/70 hover:bg-white/5 rounded-xl text-sm font-semibold transition-colors">
            <FileText size={18} /> Actualités
          </Link>
          
          <div className="pt-6 pb-2 px-4 text-xs font-bold text-white/50 tracking-wider">SYSTÈME</div>
          <Link to="/admin/users" className="flex items-center gap-3 px-4 py-2.5 text-white/70 hover:bg-white/5 rounded-xl text-sm font-semibold transition-colors">
            <Users size={18} /> Utilisateurs
          </Link>
          <Link to="/admin/settings" className="flex items-center gap-3 px-4 py-2.5 text-white/70 hover:bg-white/5 rounded-xl text-sm font-semibold transition-colors">
            <Settings size={18} /> Paramètres
          </Link>
        </nav>
        
        <div className="p-4 border-t border-white/10">
          <button className="flex w-full items-center gap-3 px-4 py-2.5 text-white/70 hover:text-white hover:bg-white/5 rounded-xl text-sm font-semibold transition-colors">
            <LogOut size={18} /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-navy/5 flex items-center px-8 shadow-sm">
          <div className="font-semibold text-navy">Dashboard</div>
        </header>
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
