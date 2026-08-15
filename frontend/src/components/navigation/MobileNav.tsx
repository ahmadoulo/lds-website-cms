import React from 'react';
import { Button } from '../ui/Button';

interface MobileNavProps {
  links: { href: string; label: string }[];
  onClose: () => void;
}

export function MobileNav({ links, onClose }: MobileNavProps) {
  return (
    <div className="lg:hidden bg-white border-t border-navy/10 px-6 py-2 pb-6 flex flex-col shadow-soft fixed left-0 right-0 z-40">
      <div className="flex flex-col gap-0.5">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={onClose}
            className="py-[15px] px-1 font-semibold text-[15px] text-navy border-b border-navy/5 hover:text-blue"
          >
            {link.label}
          </a>
        ))}
        <a href="#soutenir" onClick={onClose} className="mt-[14px]">
          <Button variant="primary" className="w-full">
            Faire un don
          </Button>
        </a>
      </div>
    </div>
  );
}
