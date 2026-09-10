import React, { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean;
}

export function Card({ children, className = '', noPadding = false, ...props }: CardProps) {
  return (
    <div 
      className={`bg-white border border-[#e5e3d9] rounded-xl shadow-sm overflow-hidden ${noPadding ? '' : 'p-6 sm:p-8'} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
