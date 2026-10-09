import React, { useEffect, useRef, useState } from 'react';
import { localizedOrSource } from '../../lib/i18n/resolve';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Heart, Mail, MapPin, Menu, Phone, X } from 'lucide-react';
import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  YouTubeIcon,
} from '../public/SocialIcons';
import { useSettings } from '../../context/SettingsContext';
import { useLocale } from '../../context/LocaleContext';
import { useT } from '../../lib/i18n/useT';
import { useLayoutT, type NavKey } from '../../lib/i18n/dictionaries/layout';
import { cn } from '../../lib/cn';
import { SiteLogo } from '../public/SiteLogo';
import { CtaLink } from '../public/CtaLink';
import { LocaleSwitch } from '../public/LocaleSwitch';
import { NewsletterSignup, useNewsletterStatus } from '../public/NewsletterSignup';
import { PreviewBanner } from '../public/PreviewBanner';

/*
  The labels used to live here as French text, which made this table the one
  place a second language could not reach. It now holds a dictionary key, so the
  eight entries are written once and read in whichever language is displayed -
  in the header, in the mobile panel and in the footer alike.
*/
const NAV: readonly { key: NavKey; href: string }[] = [
  { key: 'home', href: '/' },
  { key: 'about', href: '/a-propos' },
  { key: 'actions', href: '/nos-actions' },
  { key: 'news', href: '/actualites' },
  { key: 'gallery', href: '/galerie' },
  { key: 'impact', href: '/impact' },
  { key: 'partners', href: '/partenaires' },
  { key: 'contact', href: '/contact' },
];

const SOCIAL_ICONS = [
  { key: 'facebook', Icon: FacebookIcon, label: 'Facebook' },
  { key: 'instagram', Icon: InstagramIcon, label: 'Instagram' },
  { key: 'linkedin', Icon: LinkedInIcon, label: 'LinkedIn' },
  { key: 'youtube', Icon: YouTubeIcon, label: 'YouTube' },
] as const;

export const PublicLayout = () => {
  const { settings } = useSettings();
  const { locale, isRtl } = useLocale();
  const t = useT();
  const layout = useLayoutT();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const contact = settings?.global_contact;
  const social = settings?.global_social;
  const organization = settings?.organization;

  /*
    The settings hold one name and one tagline, both written in French. French
    keeps reading them, and Arabic reads the glossary's form of the name and the
    translated tagline rather than dropping a French sentence into an Arabic
    page. The day those settings carry two languages, these two lines are where
    that arrives.
  */
  const organizationName = (locale === 'fr' && organization?.name) || t.common.organizationName;
  // The setting now carries both languages; the dictionary covers the case of
  // a database where the Arabic has not been written yet.
  const tagline = localizedOrSource(organization?.tagline, locale).text || layout.footer.tagline;

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
        /* start-4 rather than left-4: the shortcut has to land at the edge the
           reader starts from, which is the right one in Arabic. */
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-navy focus:px-4 focus:py-2 focus:text-white"
      >
        {layout.header.skipToContent}
      </a>

      {/* Contact bar */}
      <div className="hidden bg-navy text-caption text-white/80 sm:block">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-2.5">
          <div className="flex flex-wrap gap-6">
            {contact?.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-2 transition-colors hover:text-white">
                <Mail className="h-3.5 w-3.5 text-green" aria-hidden /> <bdi>{contact.email}</bdi>
              </a>
            )}
            {contact?.phone && (
              <a
                href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                className="flex items-center gap-2 transition-colors hover:text-white"
              >
                <Phone className="h-3.5 w-3.5 text-green" aria-hidden /> <bdi>{contact.phone}</bdi>
              </a>
            )}
          </div>

          {/*
            The language switch sits where a visitor looks for it before reading
            anything: the quiet bar above the header. The mobile panel carries
            the same switch, because this bar is hidden on a phone.
          */}
          <div className="flex items-center gap-4">
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
            <LocaleSwitch />
          </div>
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
            'container-page flex items-center justify-between gap-2 transition-[padding] duration-300 sm:gap-6',
            isScrolled ? 'py-2 sm:py-3' : 'py-2.5 sm:py-4',
          )}
        >
          {/*
            Shrinkable on a phone, fixed from lg up.

            Up there the nav needs the lockup to hold its width; down here the
            lockup is the only thing that can yield, and something has to -
            otherwise the row is wider than the screen and the menu button is
            the part that leaves it.
          */}
          <Link
            to="/"
            className="flex min-w-0 shrink items-center lg:shrink-0"
            aria-label={layout.header.home}
          >
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
            aria-label={layout.header.mainNavigation}
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
                    'after:transition-transform after:duration-300',
                    /* The underline grows in the direction of reading, so it is
                       anchored at the side the line starts on. */
                    isRtl ? 'after:origin-right' : 'after:origin-left',
                    isActive
                      ? 'text-navy after:scale-x-100'
                      : 'text-navy/70 hover:text-navy after:scale-x-0 hover:after:scale-x-100',
                  )
                }
                aria-current={undefined}
              >
                {layout.nav[item.key]}
              </NavLink>
            ))}
            <CtaLink to="/nous-soutenir" className="ms-1 shrink-0 whitespace-nowrap">
              <Heart className="h-4 w-4" aria-hidden /> {layout.actions.donate}
            </CtaLink>
          </nav>

          {/*
            Always visible, never inside the menu.

            It used to live only in the burger panel on a phone, which meant a
            visitor arriving on the site had no way of knowing it was published
            in Arabic at all - they would have had to open a menu to discover a
            language they had no reason to go looking for. A switch that has to
            be found is a switch that does not exist.
          */}
          {/* lg:hidden on the group, not on each child: left visible it would
              be a third flex item on the desktop row and push the nav off the
              end it is justified to. */}
          <div className="ms-auto flex shrink-0 items-center gap-1.5 lg:hidden">
            <LocaleSwitch variant="segmented" />

            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? layout.header.closeMenu : layout.header.openMenu}
              aria-controls="menu-mobile"
              ref={menuButtonRef}
              /* 44px of tappable area; the negative margin keeps the icon on
                 the gutter - logical, so it is the trailing gutter in both
                 directions. */
              className="-me-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-navy transition-colors active:bg-navy/5 lg:hidden"
            >
              {isMenuOpen ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div
            id="menu-mobile"
            className="absolute inset-x-0 top-full max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain border-t border-navy/8 bg-white p-3 shadow-e3 lg:hidden"
          >
            <nav className="flex flex-col" aria-label={layout.header.mobileNavigation}>
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
                  {layout.nav[item.key]}
                </NavLink>
              ))}
            </nav>
            <CtaLink to="/nous-soutenir" size="lg" className="mt-4 w-full">
              <Heart className="h-4 w-4" aria-hidden /> {layout.actions.donate}
            </CtaLink>
            {/*
              The language switch is not repeated here: it now sits in the
              header bar, visible without opening anything and a few pixels
              above this panel. Two controls doing the same thing, one of them
              hidden, is what the problem was.
            */}
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
            <p className="mb-5 max-w-xs leading-relaxed text-white/65 sm:mb-6">{tagline}</p>
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

          <nav aria-label={layout.footer.footerNavigation}>
            <h2 className="mb-4 text-body font-bold sm:mb-5">{layout.footer.navigationHeading}</h2>
            <ul className="grid grid-cols-2 gap-x-4 text-white/65 sm:flex sm:flex-col sm:gap-3">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className="inline-flex min-h-11 items-center transition-colors hover:text-white sm:min-h-0"
                  >
                    {layout.nav[item.key]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="mb-4 text-body font-bold sm:mb-5">{layout.footer.contactHeading}</h2>
            <address className="flex flex-col gap-4 not-italic text-white/65">
              {contact?.address && (
                <span className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-green" aria-hidden />
                  <bdi>{localizedOrSource(contact.address, locale).text}</bdi>
                </span>
              )}
              {contact?.phone && (
                <a
                  href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                  className="flex items-center gap-3 transition-colors hover:text-white"
                >
                  <Phone className="h-4 w-4 shrink-0 text-green" aria-hidden /> <bdi>{contact.phone}</bdi>
                </a>
              )}
              {contact?.phoneSecondary && (
                <a
                  href={`tel:${contact.phoneSecondary.replace(/\s+/g, '')}`}
                  className="flex items-center gap-3 transition-colors hover:text-white"
                >
                  <Phone className="h-4 w-4 shrink-0 text-green" aria-hidden /> <bdi>{contact.phoneSecondary}</bdi>
                </a>
              )}
              {contact?.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-3 break-all transition-colors hover:text-white"
                >
                  <Mail className="h-4 w-4 shrink-0 text-green" aria-hidden /> <bdi>{contact.email}</bdi>
                </a>
              )}
            </address>

            <CtaLink to="/nous-soutenir" className="mt-6 w-full sm:w-auto">
              <Heart className="h-4 w-4" aria-hidden /> {layout.actions.donate}
            </CtaLink>
          </div>
        </div>

        <FooterNewsletter />

        <div className="container-page mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-white/45 sm:mt-14 sm:pt-8">
          <span>
            © {new Date().getFullYear()} {organizationName}. {layout.footer.rights}
          </span>
          {/*
            No link to the administration here: a visitor has no use for it,
            and printing it on every page only tells a scanner where the login
            form is.

            The credit takes its place - same size and colour as the copyright,
            so it reads as part of the footer's small print rather than as an
            advertisement. Hardcoded, not a setting.

            rel="noopener" without "noreferrer": noopener is the security half
            (the new tab cannot reach back into this one); the referrer is what
            tells Senovate the visit came from here, which is the point of a
            credit link.
          */}
          <span>
            {layout.footer.creditLead}{' '}
            <a
              href="https://senovate-it.com"
              target="_blank"
              rel="noopener"
              className="font-semibold text-white/65 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              <bdi>Senovate IT</bdi>
              <span className="sr-only"> {layout.footer.creditOpensInNewTab}</span>
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
};

/**
 * The newsletter band of the footer.
 *
 * All or nothing: when the API says signing up would not work, the band is
 * absent, heading included - a title over an empty space is a feature that
 * looks broken.
 */
const FooterNewsletter = () => {
  const t = useT();
  const status = useNewsletterStatus();
  if (!status.data?.available) return null;

  /*
    A panel of its own rather than a band between two rules. Ruled off, it
    stacked a second divider just above the copyright line, and its form
    started at a point that lined up with none of the columns above it. As a
    panel it needs no rule, reads as one thing, and the form keeps a width an
    email address actually needs instead of half the screen.
  */
  return (
    <section aria-labelledby="footer-newsletter" className="container-page mt-10 sm:mt-14">
      <div className="grid gap-5 rounded-panel bg-white/5 p-5 ring-1 ring-white/10 sm:p-7 md:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] md:items-center md:gap-10">
        <div className="flex items-start gap-4">
          <span
            aria-hidden
            className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green/15 text-green sm:flex"
          >
            <Mail className="h-5 w-5" />
          </span>
          <div>
            <h2 id="footer-newsletter" className="text-lg font-bold text-white">
              {t.newsletter.title}
            </h2>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-white/60">
              {t.newsletter.intro}
            </p>
          </div>
        </div>
        <NewsletterSignup source="footer" tone="dark" />
      </div>
    </section>
  );
};
