import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, KeyRound, LogOut, Menu, UserCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { ALL_NAV_ITEMS } from './navigation';
import { Link } from 'react-router-dom';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super administrateur',
  ADMIN: 'Administrateur',
  EDITOR: 'Éditeur',
};

export const Topbar = ({ onOpenMenu }: { onOpenMenu: () => void }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
          className="rounded-lg p-2 text-navy/60 hover:bg-navy/5 lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate text-base font-bold text-navy sm:text-lg">
          {current?.name ?? 'Administration'}
        </h1>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-navy/5"
        >
          <UserCircle className="h-7 w-7 text-navy/35" />
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-semibold leading-tight text-navy">{fullName}</span>
            <span className="block text-[11px] text-navy/50">
              {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 text-navy/40" />
        </button>

        {isMenuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} aria-hidden />
            <div
              role="menu"
              className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-navy/10 bg-white shadow-lg"
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
                <KeyRound className="h-4 w-4" /> Changer mon mot de passe
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                role="menuitem"
              >
                <LogOut className="h-4 w-4" /> Se déconnecter
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
};
