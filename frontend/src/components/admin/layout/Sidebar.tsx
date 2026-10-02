import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ExternalLink, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { NAV_GROUPS } from './navigation';
import { isNavActive } from './isNavActive';
import { cn } from '../../../lib/cn';
import { SiteLogo } from '../../public/SiteLogo';
import { useShellLocale } from '../../../lib/i18n/dictionaries/adminShell';
import { useShellT } from '../../../lib/i18n/useT';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  unreadMessages?: number;
}

export const Sidebar = ({ isOpen, onClose, unreadMessages = 0 }: SidebarProps) => {
  const { can } = useAuth();
  const location = useLocation();
  const t = useShellT();
  const { isRtl } = useShellLocale();

  const content = (
    <>
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
        <NavLink
          to="/admin"
          className="flex min-w-0 items-center gap-2"
          aria-label={t.adminShell.sidebar.dashboard}
        >
          <SiteLogo variant="dark" />
        </NavLink>
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label={t.adminShell.sidebar.closeMenu}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav
        className="scrollbar-dark flex-1 space-y-5 overflow-y-auto px-3 py-4"
        aria-label={t.adminShell.sidebar.navLabel}
      >
        {NAV_GROUPS.map((group) => {
          const visible = group.items.filter((item) => can(item.minRole));
          if (!visible.length) return null;

          return (
            <div key={group.title}>
              <p
                className={cn(
                  'mb-1.5 px-3 text-eyebrow uppercase text-white/35',
                )}
              >
                {/*
                  The navigation is a data file with no access to a hook, so its
                  French label is translated here, by group title and by route.
                  An entry the dictionary does not know keeps its French label
                  rather than disappearing from the sidebar.
                */}
                {t.adminShell.navGroups[group.title] ?? group.title}
              </p>
              <div className="space-y-0.5">
                {visible.map((item) => {
                  const isActive = isNavActive(item.href, location.pathname, location.search);

                  return (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      onClick={onClose}
                      className={cn(
                        'group flex min-h-11 items-start gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:min-h-0',
                        isActive
                          ? 'bg-blue text-white'
                          : 'text-white/70 hover:bg-white/10 hover:text-white',
                      )}
                    >
                      <item.icon className="mt-0.5 h-[18px] w-[18px] shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">
                          {t.adminShell.navLabels[item.href] ?? item.name}
                        </span>
                        {item.hint && (
                          <span
                            className={cn(
                              'block truncate text-xs font-normal',
                              isActive ? 'text-white/70' : 'text-white/40',
                            )}
                          >
                            {t.adminShell.navHints[item.href] ?? item.hint}
                          </span>
                        )}
                      </span>
                      {item.badge === 'unreadMessages' && unreadMessages > 0 && (
                        <span className="mt-0.5 rounded-full bg-orange px-2 py-0.5 text-xs font-bold text-white">
                          {/* Western Arabic digits in both languages. */}
                          <span aria-hidden>{unreadMessages}</span>
                          <span className="sr-only">
                            {t.adminShell.sidebar.unreadMessages(unreadMessages)}
                          </span>
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white lg:min-h-0"
        >
          {/*
            Not a chevron: the glyph means "opens elsewhere", not "forward", so
            it keeps its shape in both directions.
          */}
          <ExternalLink className="h-[18px] w-[18px]" />
          {t.adminShell.sidebar.viewPublicSite}
        </a>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-navy/50 transition-opacity lg:hidden',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={cn(
          'fixed inset-y-0 start-0 z-50 flex w-64 flex-col bg-navy transition-transform lg:hidden',
          /*
            The drawer slides out of the edge it is docked to: the left in
            French, the right in Arabic. `start-0` moves the panel, but the
            transform is a geometric value and has to be flipped by hand.
          */
          isOpen ? 'translate-x-0' : isRtl ? 'translate-x-full' : '-translate-x-full',
        )}
      >
        {content}
      </aside>

      {/* Desktop rail */}
      <aside className="hidden w-64 shrink-0 flex-col bg-navy lg:flex">{content}</aside>
    </>
  );
};
