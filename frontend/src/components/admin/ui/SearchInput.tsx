import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '../../ui/Field';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchInput = ({ value, onChange, placeholder = 'Rechercher…' }: SearchInputProps) => (
  <div className="relative w-full sm:max-w-xs">
    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/35" />
    <Input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="pl-9 pr-9"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label="Effacer la recherche"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-navy/40 hover:text-navy"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
);
