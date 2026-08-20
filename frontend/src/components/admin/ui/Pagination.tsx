import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../ui/Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export const Pagination = ({ page, totalPages, total, onPageChange }: PaginationProps) => {
  if (totalPages <= 1) {
    return (
      <p className="px-1 py-3 text-xs text-navy/45">
        {total} élément{total > 1 ? 's' : ''}
      </p>
    );
  }

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-navy/8 px-1 py-3"
    >
      <p className="text-xs text-navy/50">
        Page {page} sur {totalPages} · {total} élément{total > 1 ? 's' : ''}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Suivant <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </nav>
  );
};
