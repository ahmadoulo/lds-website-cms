import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, KeyRound, LogOut, Menu, UserCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { ALL_NAV_ITEMS } from './navigation';
import { Link } from 'react-router-dom';
import { LocaleSwitch } from '../../public/LocaleSwitch';
import { useShellLocale } from '../../../lib/i18n/dictionaries/adminShell';
import { useShellT } from '../../../lib/i18n/useT';
import { cn } from '../../../lib/cn';

export const Topbar = ({ onOpenMenu }: { onOpenMenu: () => void }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const t = useShellT();
  const { isRtl } = useShellLocale();

  // Longest matching nav href wins, so /admin never shadows /admin/actualites.
  const current = ALL_NAV_ITEMS.filter((item) =>
    item.href === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(item.href),
  ).sort((a, b) => b.href.length - a.href.length)[0];

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-navy/10 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          className="-ms-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-navy/60 hover:bg-navy/5 lg:hidden"
          aria-label={t.adminShell.topbar.openMenu}
        >
          {/* Three stacked bars: nothing to mirror. */}
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-base font-bold text-navy sm:text-lg">
          {(current && t.adminShell.navLabels[current.href]) ??
            current?.name ??
            t.adminShell.topbar.fallbackTitle}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        {/*
          The administration is worked in by the same people who read the site,
          and the choice has to be reachable from every screen of it - not only
          from the public header.
        */}
        <LocaleSwitch className="text-navy" />

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
            aria-label={t.adminShell.topbar.accountMenu}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-navy/5"
          >
            <UserCircle className="h-7 w-7 text-navy/35" />
            <span className="hidden text-start sm:block">
              <span className="block text-sm font-semibold leading-tight text-navy">{fullName}</span>
              <span className="block text-xs text-navy/50">
                {t.adminShell.roles[user?.role ?? ''] ?? user?.role}
              </span>
            </span>
            {/* Down is down in both directions: a vertical chevron is not mirrored. */}
            <ChevronDown className="h-4 w-4 text-navy/40" />
          </button>

          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} aria-hidden />
              <div
                role="menu"
                className="absolute end-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-navy/10 bg-white shadow-lg"
              >
                <div className="border-b border-navy/8 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-navy">{fullName}</p>
                  <p className="truncate text-xs text-navy/50">{user?.email}</p>
                </div>
                <Link
                  to="/admin/mot-de-passe"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-navy/75 transition-colors hover:bg-warm-muted"
                  role="menuitem"
                >
                  <KeyRound className="h-4 w-4" /> {t.adminShell.topbar.changePassword}
                </Link>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                  role="menuitem"
                >
                  {/*
                    A door with an arrow leaving it: the arrow follows the reading
                    direction, so the whole glyph turns around in Arabic.
                  */}
                  <LogOut className={cn('h-4 w-4', isRtl && 'rotate-180')} />{' '}
                  {t.adminShell.topbar.logout}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
