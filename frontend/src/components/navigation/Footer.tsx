import React from 'react';
import { Container } from '../layout/Container';
import { MapPin, Phone, Mail } from 'lucide-react';

const NAV_LINKS = [
  { href: '#accueil', label: 'Accueil' },
  { href: '#association', label: "L'Association" },
  { href: '#missions', label: 'Missions' },
  { href: '#galerie', label: 'Galerie' },
  { href: '#actualites', label: 'Actualités' },
  { href: '#contact', label: 'Contact' },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="contact" className="bg-navy text-white/85 pt-24">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 pb-16 border-b border-white/10">
          <div>
            <div className="bg-white inline-flex px-4 py-2.5 rounded-xl mb-6">
              <div className="font-extrabold text-xl text-navy">LDS</div>
            </div>
            <p className="text-[14px] leading-relaxed text-white/65 mb-6 max-w-[280px]">
              Solidarité et action pour un avenir meilleur à Louga. Rejoignez-nous pour construire ensemble le développement de notre communauté.
            </p>
            <div className="flex gap-2.5">
              <a href="#" aria-label="Facebook" className="w-[38px] h-[38px] rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-blue transition-colors">
                <i className="fa-brands fa-facebook-f"></i>
              </a>
              <a href="#" aria-label="Instagram" className="w-[38px] h-[38px] rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-orange transition-colors">
                <i className="fa-brands fa-instagram"></i>
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="text-[15px] font-extrabold mb-6 text-white">Navigation</h4>
            <div className="flex flex-col gap-3">
              {NAV_LINKS.map(link => (
                <a key={link.href} href={link.href} className="text-white/70 text-[14px] hover:text-green transition-colors">
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[15px] font-extrabold mb-6 text-white">Contact</h4>
            <div className="flex flex-col gap-4 text-[14px] text-white/70">
              <div className="flex gap-3 items-start">
                <MapPin className="text-green w-4 h-4 mt-1" />
                <span>Keur Serigne Louga Nord<br />Rue 11 Villa 342<br />Louga, Sénégal</span>
              </div>
              <a href="tel:+221774723364" className="flex gap-3 items-center hover:text-white transition-colors">
                <Phone className="text-green w-4 h-4" />+221 77 472 33 64
              </a>
              <a href="tel:+221778613202" className="flex gap-3 items-center hover:text-white transition-colors">
                <Phone className="text-green w-4 h-4" />+221 77 861 32 02
              </a>
              <a href="mailto:lougasolidaire@gmail.com" className="flex gap-3 items-center hover:text-white transition-colors">
                <Mail className="text-green w-4 h-4" />lougasolidaire@gmail.com
              </a>
            </div>
          </div>
        </div>

        <div className="py-6 flex justify-between flex-wrap gap-2.5 text-[13px] text-white/50">
          <span>© {currentYear} Association Louga Développement Solidaire. Tous droits réservés.</span>
          <span>Conçu avec solidarité pour Louga.</span>
        </div>
      </Container>
    </footer>
  );
}
