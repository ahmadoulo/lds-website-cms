import React, { useState, useEffect } from 'react';
import { Outlet, Link, NavLink } from 'react-router-dom';
import { Phone, Mail, Menu, X, Globe, Link as LinkIcon, Heart } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useSettings } from '../../context/SettingsContext';

const cn = (...inputs: (string | undefined | null | false)[]) => twMerge(clsx(inputs));

export const PublicLayout = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { settings } = useSettings();
  
  const email = settings.global_contact?.email || 'lougasolidaire@gmail.com';
  const phone = settings.global_contact?.phone || '+221 77 472 33 64';
  const facebook = settings.global_social?.facebook || '#';
  const instagram = settings.global_social?.instagram || '#';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const nav = [
    { label: 'Accueil', href: '/' },
    { label: "À propos", href: '/a-propos' },
    { label: 'Nos actions', href: '/nos-actions' },
    { label: 'Actualités', href: '/actualites' },
    { label: 'Galerie', href: '/galerie' },
    { label: 'Impact', href: '/impact' },
    { label: 'Partenaires', href: '/partenaires' },
    { label: 'Contact', href: '/contact' },
  ];

  return (
    <div className="font-montserrat bg-[#FBF9F5] text-[#172642] overflow-x-hidden flex flex-col min-h-screen">
      {/* Top Contact Bar */}
      <div className="bg-[#172642] text-white/85 text-[13px] shrink-0">
        <div className="max-w-[1280px] mx-auto px-6 py-2.5 flex justify-between items-center flex-wrap gap-2">
          <div className="flex gap-6 flex-wrap">
            <a href={`mailto:${email}`} className="hover:text-white transition-colors flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#87CE18]" /> {email}
            </a>
            <a href={`tel:${phone.replace(/\s+/g, '')}`} className="hover:text-white transition-colors flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#87CE18]" /> {phone}
            </a>
          </div>
          <div className="flex gap-2.5">
            <a href={facebook} target="_blank" rel="noreferrer" className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#00A4DE] transition-colors">
              <Globe className="w-3 h-3" />
            </a>
            <a href={instagram} target="_blank" rel="noreferrer" className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#EE7900] transition-colors">
              <LinkIcon className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Sticky Header */}
      <header className={cn(
        "sticky top-0 z-50 transition-all duration-300 bg-white shrink-0",
        isScrolled ? "shadow-[0_8px_30px_rgb(0,0,0,0.08)] py-3" : "py-4"
      )}>
        <div className="max-w-[1280px] mx-auto px-6 flex items-center justify-between gap-6">
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold tracking-tighter text-[#172642]">
              LDS <span className="text-[#87CE18]">Louga</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-7">
            {nav.map((item) => (
              <NavLink 
                key={item.label} 
                to={item.href} 
                className={({ isActive }) => 
                  cn(
                    "text-[14.5px] font-semibold transition-colors",
                    isActive ? "text-[#00A4DE]" : "text-[#172642] hover:text-[#00A4DE]"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <Link to="/nous-soutenir" className="bg-[#EE7900] hover:bg-[#172642] text-white px-6 py-2.5 rounded-full font-bold text-[14px] flex items-center gap-2 shadow-[0_10px_22px_-8px_rgba(238,121,0,0.55)] transition-all">
              <Heart className="w-4 h-4" /> Faire un don
            </Link>
          </nav>

          {/* Mobile Menu Toggle */}
          <button 
            className="lg:hidden text-[#172642] p-1"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white border-t border-gray-100 p-6 flex flex-col gap-1 shadow-lg">
            {nav.map((item) => (
              <NavLink 
                key={item.label} 
                to={item.href} 
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => 
                  cn(
                    "py-3.5 px-2 font-semibold text-[15px] border-b border-gray-50",
                    isActive ? "text-[#00A4DE]" : "text-[#172642]"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <Link 
              to="/nous-soutenir" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="mt-4 bg-[#EE7900] text-white p-3.5 rounded-xl font-bold text-center flex items-center justify-center gap-2"
            >
              <Heart className="w-4 h-4" /> Faire un don
            </Link>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-[#172642] text-white pt-20 pb-10 px-6 shrink-0 mt-auto">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          <div>
            <span className="text-2xl font-bold tracking-tighter text-white mb-6 block">
              LDS <span className="text-[#87CE18]">Louga</span>
            </span>
            <p className="text-gray-400 leading-relaxed mb-6">
              Association à but non lucratif engagée pour l'éducation, la santé et le développement durable des Lougatois.
            </p>
            <div className="flex gap-3">
              <a href={facebook} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#00A4DE] transition-colors">
                <Globe className="w-4 h-4" />
              </a>
              <a href={instagram} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#EE7900] transition-colors">
                <LinkIcon className="w-4 h-4" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="text-lg font-bold mb-6 font-montserrat">Navigation</h4>
            <div className="flex flex-col gap-3 text-gray-400">
              <Link to="/" className="hover:text-white transition-colors">Accueil</Link>
              <Link to="/a-propos" className="hover:text-white transition-colors">L'Association</Link>
              <Link to="/nos-actions" className="hover:text-white transition-colors">Nos Missions</Link>
              <Link to="/galerie" className="hover:text-white transition-colors">Galerie Photos</Link>
              <Link to="/actualites" className="hover:text-white transition-colors">Actualités</Link>
            </div>
          </div>
          <div>
            <h4 className="text-lg font-bold mb-6 font-montserrat">Contact</h4>
            <div className="flex flex-col gap-4 text-gray-400">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-[#87CE18] shrink-0 mt-0.5" />
                <span>{phone}</span>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-[#87CE18] shrink-0 mt-0.5" />
                <span>{email}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-[1280px] mx-auto border-t border-white/10 pt-8 text-center text-sm text-gray-500 font-medium">
          &copy; {new Date().getFullYear()} Louga Développement Solidaire. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
};

