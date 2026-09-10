import React, { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-medium text-[#555] mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-3 py-2 text-xs rounded-md border focus:outline-none focus:border-[#2d2d2d] bg-[#fdfcf9] transition-colors ${
            error ? 'border-red-300' : 'border-[#e5e3d9]'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
