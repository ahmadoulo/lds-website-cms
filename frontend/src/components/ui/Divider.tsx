import React from 'react';

export function Divider({ className = '' }: { className?: string }) {
  return <hr className={`border-t border-navy/5 ${className}`} />;
}
