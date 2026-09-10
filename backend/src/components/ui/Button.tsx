import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
}

export function Button({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  disabled,
  ...props 
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none';
  
  const variants = {
    primary: 'bg-[#2d2d2d] text-white hover:bg-[#1a1a1a]',
    secondary: 'bg-white border border-[#e5e3d9] text-[#444] hover:bg-gray-50',
    danger: 'bg-white border border-red-200 text-red-600 hover:bg-red-50',
    ghost: 'bg-transparent text-[#666] hover:text-[#1a1a1a] hover:bg-gray-100'
  };

  return (
    <button
      className={`${baseStyles} px-4 py-2 ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  );
}
