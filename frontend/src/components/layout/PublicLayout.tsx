import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Heart, Mail, MapPin, Menu, Phone, X } from 'lucide-react';
import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  YouTubeIcon,
} from '../public/SocialIcons';
import { useSettings } from '../../context/SettingsContext';
import { cn } from '../../lib/cn';
import { SiteLogo } from '../public/SiteLogo';

const NAV = [
  { label: 'Accueil', href: '/' },
  { label: 'À propos', href: '/a-propos' },
  { label: 'Nos actions', href: '/nos-actions' },
  { label: 'Actualités', href: '/actualites' },
  { label: 'Galerie', href: '/galerie' },
  { label: 'Impact', href: '/impact' },
  { label: 'Partenaires', href: '/partenaires' },
  { label: 'Contact', href: '/contact' },
];

const SOCIAL_ICONS = [
  { key: 'facebook', Icon: FacebookIcon, label: 'Facebook' },
  { key: 'instagram', Icon: InstagramIcon, label: 'Instagram' },
  { key: 'linkedin', Icon: LinkedInIcon, label: 'LinkedIn' },
  { key: 'youtube', Icon: YouTubeIcon, label: 'YouTube' },
] as const;

export const PublicLayout = () => {
  const { settings } = useSettings();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const contact = settings?.global_contact;
  const social = settings?.global_social;
  const organization = settings?.organization;


  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu whenever the route changes.
  useEffect(() => setIsMenuOpen(false), [location.pathname]);

  const activeSocial = SOCIAL_ICONS.filter(({ key }) => social?.[key]);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-warm font-montserrat text-navy">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-navy focus:px-4 focus:py-2 focus:text-white"
      >
        Aller au contenu principal
      </a>

      {/* Contact bar */}
      <div className="hidden bg-navy text-[13px] text-white/80 sm:block">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-6 py-2.5">
          <div className="flex flex-wrap gap-6">
            {contact?.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-2 transition-colors hover:text-white">
                <Mail className="h-3.5 w-3.5 text-green" aria-hidden /> {contact.email}
              </a>
            )}
            {contact?.phone && (
              <a
                href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                className="flex items-center gap-2 transition-colors hover:text-white"
              >
                <Phone className="h-3.5 w-3.5 text-green" aria-hidden /> {contact.phone}
              </a>
            )}
          </div>

          {activeSocial.length > 0 && (
            <div className="flex gap-2">
              {activeSocial.map(({ key, Icon, label }) => (
                <a
                  key={key}
                  href={social![key]}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={label}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-blue"
                >
                  <Icon className="h-3 w-3" aria-hidden />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Header */}
      <header
        className={cn(
          'sticky top-0 z-50 bg-white transition-shadow duration-300',
          isScrolled ? 'shadow-[0_8px_30px_rgba(23,38,66,0.08)]' : '',
        )}
      >
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-6 py-4">
          <Link to="/" className="flex items-center" aria-label="Accueil">
            <SiteLogo />
          </Link>

          <nav className="hidden items-center gap-7 lg:flex" aria-label="Navigation principale">
            {NAV.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === '/'}
                className={({ isActive }) =>
                  cn(
                    'text-[14.5px] font-semibold transition-colors',
                    isActive ? 'text-blue' : 'text-navy hover:text-blue',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <Link
              to="/nous-soutenir"
              className="flex items-center gap-2 rounded-full bg-orange px-6 py-2.5 text-[14px] font-bold text-white shadow-[0_10px_22px_-8px_rgba(238,121,0,0.55)] transition-colors hover:bg-navy"
            >
              <Heart className="h-4 w-4" aria-hidden /> Faire un don
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="p-1 text-navy lg:hidden"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="absolute inset-x-0 top-full flex flex-col gap-1 border-t border-navy/8 bg-white p-5 shadow-lg lg:hidden">
            {NAV.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === '/'}
                className={({ isActive }) =>
                  cn(
                    'border-b border-navy/5 px-2 py-3.5 text-[15px] font-semibold',
                    isActive ? 'text-blue' : 'text-navy',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <Link
              to="/nous-soutenir"
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-orange p-3.5 font-bold text-white"
            >
              <Heart className="h-4 w-4" aria-hidden /> Faire un don
            </Link>
          </div>
        )}
      </header>

      <main id="contenu" className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mt-auto bg-navy px-6 pb-10 pt-16 text-white">
        <div className="mx-auto grid max-w-[1280px] gap-10 md:grid-cols-3 lg:gap-12">
          <div>
            <span className="mb-5 block">
              <SiteLogo variant="dark" />
            </span>
            <p className="mb-6 max-w-xs leading-relaxed text-white/65">
              {organization?.tagline ||
                "Association à but non lucratif engagée pour l'éducation, la santé et le développement durable des Lougatois."}
            </p>
            {activeSocial.length > 0 && (
              <div className="flex gap-3">
                {activeSocial.map(({ key, Icon, label }) => (
                  <a
                    key={key}
                    href={social![key]}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={label}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-blue"
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </a>
                ))}
              </div>
            )}
          </div>

          <nav aria-label="Navigation du pied de page">
            <h2 className="mb-5 text-[15px] font-bold">Navigation</h2>
            <ul className="flex flex-col gap-3 text-white/65">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link to={item.href} className="transition-colors hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="mb-5 text-[15px] font-bold">Contact</h2>
            <address className="flex flex-col gap-4 not-italic text-white/65">
              {contact?.address && (
                <span className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-green" aria-hidden />
                  <span>{contact.address}</span>
                </span>
              )}
              {contact?.phone && (
                <a
                  href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                  className="flex items-center gap-3 transition-colors hover:text-white"
                >
                  <Phone className="h-4 w-4 shrink-0 text-green" aria-hidden /> {contact.phone}
                </a>
              )}
              {contact?.phoneSecondary && (
                <a
                  href={`tel:${contact.phoneSecondary.replace(/\s+/g, '')}`}
                  className="flex items-center gap-3 transition-colors hover:text-white"
                >
                  <Phone className="h-4 w-4 shrink-0 text-green" aria-hidden /> {contact.phoneSecondary}
                </a>
              )}
              {contact?.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-3 break-all transition-colors hover:text-white"
                >
                  <Mail className="h-4 w-4 shrink-0 text-green" aria-hidden /> {contact.email}
                </a>
              )}
            </address>
          </div>
        </div>

        <div className="mx-auto mt-14 flex max-w-[1280px] flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-8 text-sm text-white/45">
          <span>
            © {new Date().getFullYear()} {organization?.name || 'Louga Développement Solidaire'}. Tous
            droits réservés.
          </span>
          <Link to="/admin/login" className="transition-colors hover:text-white/80">
            Administration
          </Link>
        </div>
      </footer>
    </div>
  );
};
