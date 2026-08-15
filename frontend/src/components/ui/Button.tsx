import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'blue' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-bold text-[14.5px] px-[26px] py-[12px] rounded-full transition-all duration-250';
  
  const variants = {
    primary: 'bg-orange text-white shadow-[0_10px_22px_-8px_rgba(238,121,0,0.55)] hover:bg-navy',
    secondary: 'bg-white text-navy border-2 border-navy/15 hover:border-navy hover:bg-transparent',
    blue: 'bg-blue text-white hover:bg-navy',
    ghost: 'bg-transparent text-navy hover:bg-navy/5',
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
