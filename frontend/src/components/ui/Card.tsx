import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

export function Card({ children, className = '', hoverable = false }: CardProps) {
  const hoverStyles = hoverable ? 'transition-all duration-300 hover:-translate-y-1.5 hover:shadow-soft-hover' : '';
  
  return (
    <div className={`bg-white rounded-[20px] overflow-hidden shadow-soft ${hoverStyles} ${className}`}>
      {children}
    </div>
  );
}
