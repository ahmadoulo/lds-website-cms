import React from 'react';

type IconColor = 'green' | 'blue' | 'orange' | 'navy';

interface IconCircleProps {
  color?: IconColor;
  icon: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function IconCircle({ color = 'green', icon, className = '', size = 'md' }: IconCircleProps) {
  const colors = {
    green: 'bg-green text-white shadow-[0_8px_16px_-4px_rgba(135,206,24,0.4)]',
    blue: 'bg-blue text-white shadow-[0_8px_16px_-4px_rgba(0,164,222,0.4)]',
    orange: 'bg-orange text-white shadow-[0_8px_16px_-4px_rgba(238,121,0,0.4)]',
    navy: 'bg-navy text-white shadow-[0_8px_16px_-4px_rgba(23,38,66,0.4)]',
  };

  const sizes = {
    sm: 'w-[38px] h-[38px] text-[15px]',
    md: 'w-[50px] h-[50px] text-[19px]',
    lg: 'w-[60px] h-[60px] text-[22px]',
  };

  return (
    <div className={`rounded-full flex items-center justify-center flex-shrink-0 ${colors[color]} ${sizes[size]} ${className}`}>
      {icon}
    </div>
  );
}
