import React, { useCallback, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/*
  Everything a Tab can reach. `summary` and `[contenteditable]` are included
  because either can hold focus and would otherwise let the ring escape the
  dialog; `[aria-hidden="true"]` is excluded because nothing inside it should.
*/
const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button',
  'input',
  'select',
  'textarea',
  'summary',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])',
]
  .map((selector) => `${selector}:not([aria-hidden="true"])`)
  .join(', ');

/*
  Dialogs nest - a confirmation opens on top of a form - and each one used to
  capture and restore document.body.style.overflow on its own. The inner one
  then captured the 'hidden' the outer had just set, and depending on the order
  React tore them down in, the page could be left frozen with no dialog on
  screen. Counting instead: the first dialog locks and remembers, the last one
  restores.
*/
let openDialogs = 0;
let overflowBeforeFirst = '';

function lockScroll() {
  if (openDialogs === 0) overflowBeforeFirst = document.body.style.overflow;
  openDialogs += 1;
  document.body.style.overflow = 'hidden';
}

function releaseScroll() {
  openDialogs = Math.max(0, openDialogs - 1);
  if (openDialogs === 0) document.body.style.overflow = overflowBeforeFirst;
}

const SIZES = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  /*
    onClose lives in a ref because no caller passes a stable one: every admin
    screen declares `const closeForm = () => ...` inline, so a new function
    arrives on each render. When it was an effect dependency the whole effect
    re-ran on every render of the parent and called panelRef.focus() again,
    which pulled the caret out of whatever field the editor was typing in.
    The ref is written in an effect rather than during render, because
    StrictMode renders twice and a discarded render must not mutate it.
  */
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  const close = useCallback(() => closeRef.current(), []);

  // Scroll lock, initial focus and focus restoration. Keyed on isOpen alone.
  useEffect(() => {
    if (!isOpen) return undefined;

    // The element that opened the dialog, so the focus can go back to it.
    const opener = document.activeElement as HTMLElement | null;
    lockScroll();
    panelRef.current?.focus();

    return () => {
      releaseScroll();
      // A row deleted from inside the dialog takes its trigger with it; focusing
      // a detached node silently drops the caret on <body>.
      if (opener?.isConnected) opener.focus();
    };
  }, [isOpen]);

  // Escape closes, and Tab stays inside the dialog.
  useEffect(() => {
    if (!isOpen) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      const panel = panelRef.current;
      if (!panel) return;

      /*
        Both dialogs listen on `document`, so stopPropagation cannot separate
        them and the outer one is registered first. A dialog therefore ignores
        the key whenever a deeper dialog is open inside it - otherwise Escape
        on a confirmation would also throw away the form behind it.
      */
      if (panel.querySelector('[role="dialog"]')) return;

      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) =>
          !element.hasAttribute('disabled') &&
          element.offsetParent !== null &&
          // A nested dialog renders inside our children: its controls are not ours.
          element.closest('[role="dialog"]') === panel,
      );

      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      // Focus left the dialog entirely (a click on the page behind, or the
      // browser chrome handing it back to <body>): bring it home.
      if (!active || !panel.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }

      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          /* dvh: with vh the sheet is taller than the visible area on a phone and
             the save button sits under the browser chrome. */
          'flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-2xl outline-none sm:rounded-2xl',
          SIZES[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-navy/10 px-5 py-4 sm:px-6">
          <div>
            <h2 id={titleId} className="text-lg font-bold text-navy">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-navy/60">{description}</p>}
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-navy/40 transition-colors hover:bg-navy/5 hover:text-navy sm:h-8 sm:w-8"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* tabIndex makes the scrollable region reachable by keyboard: without
            it a long body can only be scrolled with a pointer. */}
        <div tabIndex={0} className="flex-1 overflow-y-auto px-5 py-5 outline-none sm:px-6">
          {children}
        </div>

        {footer && (
          <div className="flex flex-wrap justify-end gap-3 border-t border-navy/10 px-5 py-4 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
