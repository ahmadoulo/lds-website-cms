import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '../ui/Button';
import { MobileNav } from './MobileNav';

const NAV_LINKS = [
  { href: '#accueil', label: 'Accueil' },
  { href: '#association', label: "L'Association" },
  { href: '#missions', label: 'Missions' },
  { href: '#galerie', label: 'Galerie' },
  { href: '#actualites', label: 'Actualités' },
  { href: '#contact', label: 'Contact' },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 16);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header className={`sticky top-0 z-50 bg-white transition-shadow duration-300 ${scrolled ? 'shadow-[0_6px_24px_rgba(23,38,66,0.1)]' : ''}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <a href="#accueil" className="flex items-center">
            {/* Replace with actual logo URL from CMS or assets */}
            <div className="font-extrabold text-2xl text-navy">LDS</div>
          </a>
          
          <nav className="hidden lg:flex items-center gap-[30px]">
            {NAV_LINKS.map(link => (
              <a 
                key={link.href} 
                href={link.href}
                className="font-semibold text-[15px] text-navy hover:text-blue transition-colors"
              >
                {link.label}
              </a>
            ))}
            <a href="#soutenir">
              <Button variant="primary">Faire un don</Button>
            </a>
          </nav>

          <button 
            type="button" 
            className="lg:hidden text-navy p-1"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>
      
      {mobileMenuOpen && (
        <MobileNav links={NAV_LINKS} onClose={() => setMobileMenuOpen(false)} />
      )}
    </>
  );
}
