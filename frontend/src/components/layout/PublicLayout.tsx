import React, { useEffect, useRef, useState } from 'react';
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
import { CtaLink } from '../public/CtaLink';
import { PreviewBanner } from '../public/PreviewBanner';

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
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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

  /*
    An open panel has to answer the three gestures a phone user expects: the
    back-equivalent (Escape, for a keyboard or an external one), a tap beside
    it, and no page sliding underneath it. Focus returns to the button so a
    keyboard user is not dropped at the top of the document.
  */
  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (headerRef.current?.contains(event.target as Node)) return;
      setIsMenuOpen(false);
    };

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isMenuOpen]);

  const activeSocial = SOCIAL_ICONS.filter(({ key }) => social?.[key]);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-warm font-montserrat text-navy">
      <PreviewBanner />
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-navy focus:px-4 focus:py-2 focus:text-white"
      >
        Aller au contenu principal
      </a>

      {/* Contact bar */}
      <div className="hidden bg-navy text-caption text-white/80 sm:block">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-2.5">
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
        ref={headerRef}
        className={cn(
          'sticky top-0 z-50 border-b bg-white/95 backdrop-blur transition-[box-shadow,border-color] duration-300',
          isScrolled ? 'border-navy/8 shadow-header' : 'border-transparent',
        )}
      >
        <div
          className={cn(
            'container-page flex items-center justify-between gap-4 transition-[padding] duration-300 sm:gap-6',
            isScrolled ? 'py-2 sm:py-3' : 'py-2.5 sm:py-4',
          )}
        >
          <Link to="/" className="flex shrink-0 items-center" aria-label="Accueil">
            <SiteLogo />
          </Link>

          {/*
            shrink-0 is the actual fix: with justify-between the nav was a
            shrinkable flex item, so it was compressed until "À propos",
            "Nos actions" and even the donate button broke over two lines,
            while empty space sat beside them.
          */}
          <nav
            className="hidden shrink-0 items-center gap-4 lg:flex xl:gap-7"
            aria-label="Navigation principale"
          >
            {NAV.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === '/'}
                className={({ isActive }) =>
                  cn(
                    'relative whitespace-nowrap py-1 text-body font-semibold transition-colors',
                    'after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-blue',
                    'after:origin-left after:transition-transform after:duration-300',
                    isActive
                      ? 'text-navy after:scale-x-100'
                      : 'text-navy/70 hover:text-navy after:scale-x-0 hover:after:scale-x-100',
                  )
                }
                aria-current={undefined}
              >
                {item.label}
              </NavLink>
            ))}
            <CtaLink to="/nous-soutenir" className="ml-1 shrink-0 whitespace-nowrap">
              <Heart className="h-4 w-4" aria-hidden /> Faire un don
            </CtaLink>
          </nav>

          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-controls="menu-mobile"
            ref={menuButtonRef}
            /* 44px of tappable area; the negative margin keeps the icon on the gutter. */
            className="-mr-2.5 flex h-11 w-11 items-center justify-center rounded-xl text-navy transition-colors active:bg-navy/5 lg:hidden"
          >
            {isMenuOpen ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
          </button>
        </div>

        {isMenuOpen && (
          <div
            id="menu-mobile"
            className="absolute inset-x-0 top-full max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain border-t border-navy/8 bg-white p-3 shadow-e3 lg:hidden"
          >
            <nav className="flex flex-col" aria-label="Navigation mobile">
              {NAV.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.href === '/'}
                  className={({ isActive }) =>
                    cn(
                      'rounded-xl px-3 py-3.5 text-body-lg font-semibold transition-colors',
                      isActive ? 'bg-blue/10 text-blue' : 'text-navy hover:bg-navy/5',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <CtaLink to="/nous-soutenir" size="lg" className="mt-4 w-full">
              <Heart className="h-4 w-4" aria-hidden /> Faire un don
            </CtaLink>
          </div>
        )}
      </header>

      <main id="contenu" className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mt-auto bg-navy pb-8 pt-12 text-white sm:pb-10 sm:pt-16">
        <div className="container-page grid gap-8 md:grid-cols-3 md:gap-10 lg:gap-12">
          <div>
            <span className="mb-4 block sm:mb-5">
              <SiteLogo variant="dark" />
            </span>
            <p className="mb-5 max-w-xs leading-relaxed text-white/65 sm:mb-6">
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
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-blue sm:h-10 sm:w-10"
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </a>
                ))}
              </div>
            )}
          </div>

          <nav aria-label="Navigation du pied de page">
            <h2 className="mb-4 text-body font-bold sm:mb-5">Navigation</h2>
            <ul className="grid grid-cols-2 gap-x-4 text-white/65 sm:flex sm:flex-col sm:gap-3">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className="inline-flex min-h-11 items-center transition-colors hover:text-white sm:min-h-0"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="mb-4 text-body font-bold sm:mb-5">Contact</h2>
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

            <CtaLink to="/nous-soutenir" className="mt-6 w-full sm:w-auto">
              <Heart className="h-4 w-4" aria-hidden /> Faire un don
            </CtaLink>
          </div>
        </div>

        <div className="container-page mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-white/45 sm:mt-14 sm:pt-8">
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
