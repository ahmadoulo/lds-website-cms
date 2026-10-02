import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '../../ui/Field';
import { useShellT } from '../../../lib/i18n/useT';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchInput = ({ value, onChange, placeholder }: SearchInputProps) => {
  const t = useShellT();
  // Resolved here rather than as a default argument, which cannot read a hook.
  const hint = placeholder ?? t.adminShell.search.placeholder;

  return (
    <div className="relative w-full sm:max-w-xs">
      {/* A magnifying glass is not directional; only its position is. */}
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/35" />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={hint}
        aria-label={hint}
        className="ps-9 pe-9"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t.adminShell.search.clear}
          className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-navy/40 hover:text-navy"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
