import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../ui/Button';
import { cn } from '../../../lib/cn';
import { useShellLocale } from '../../../lib/i18n/dictionaries/adminShell';
import { useShellT } from '../../../lib/i18n/useT';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export const Pagination = ({ page, totalPages, total, onPageChange }: PaginationProps) => {
  const t = useShellT();
  const { isRtl } = useShellLocale();

  /*
    "Previous" points backwards along the line being read, so the glyph turns
    around with the language: the chevron on the previous button looks left in
    French and right in Arabic. The count itself is written in Western Arabic
    digits in both languages.
  */
  const back = <ChevronLeft className={cn('h-3.5 w-3.5', isRtl && 'rotate-180')} />;
  const forward = <ChevronRight className={cn('h-3.5 w-3.5', isRtl && 'rotate-180')} />;

  if (totalPages <= 1) {
    return <p className="px-1 py-3 text-xs text-navy/45">{t.adminShell.pagination.items(total)}</p>;
  }

  return (
    <nav
      aria-label={t.adminShell.pagination.label}
      className="flex flex-wrap items-center justify-between gap-3 border-t border-navy/8 px-1 py-3"
    >
      <p className="text-xs text-navy/50">
        {t.adminShell.pagination.pageOf(page, totalPages)} · {t.adminShell.pagination.items(total)}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          {back} {t.common.previous}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          {t.common.next} {forward}
        </Button>
      </div>
    </nav>
  );
};
