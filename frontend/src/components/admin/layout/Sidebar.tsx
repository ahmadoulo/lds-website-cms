import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ExternalLink, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { NAV_GROUPS } from './navigation';
import { isNavActive } from './isNavActive';
import { cn } from '../../../lib/cn';
import { SiteLogo } from '../../public/SiteLogo';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  unreadMessages?: number;
}

export const Sidebar = ({ isOpen, onClose, unreadMessages = 0 }: SidebarProps) => {
  const { can } = useAuth();
  const location = useLocation();

  const content = (
    <>
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
        <NavLink to="/admin" className="flex min-w-0 items-center gap-2" aria-label="Tableau de bord">
          <SiteLogo variant="dark" className="max-h-9" />
        </NavLink>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Fermer le menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav
        className="scrollbar-dark flex-1 space-y-5 overflow-y-auto px-3 py-4"
        aria-label="Navigation administration"
      >
        {NAV_GROUPS.map((group) => {
          const visible = group.items.filter((item) => can(item.minRole));
          if (!visible.length) return null;

          return (
            <div key={group.title}>
              <p className="mb-1.5 px-3 text-eyebrow uppercasest text-white/35">
                {group.title}
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
                        'group flex items-start gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-blue text-white'
                          : 'text-white/70 hover:bg-white/10 hover:text-white',
                      )}
                    >
                      <item.icon className="mt-0.5 h-[18px] w-[18px] shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{item.name}</span>
                        {item.hint && (
                          <span
                            className={cn(
                              'block truncate text-xs font-normal',
                              isActive ? 'text-white/70' : 'text-white/40',
                            )}
                          >
                            {item.hint}
                          </span>
                        )}
                      </span>
                      {item.badge === 'unreadMessages' && unreadMessages > 0 && (
                        <span className="mt-0.5 rounded-full bg-orange px-2 py-0.5 text-xs font-bold text-white">
                          {unreadMessages}
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
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ExternalLink className="h-[18px] w-[18px]" />
          Voir le site public
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
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-navy transition-transform lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {content}
      </aside>

      {/* Desktop rail */}
      <aside className="hidden w-64 shrink-0 flex-col bg-navy lg:flex">{content}</aside>
    </>
  );
};
