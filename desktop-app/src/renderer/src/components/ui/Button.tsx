import React from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'font-medium rounded-lg inline-flex items-center justify-center transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none'

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-5 py-3 gap-2.5'
  }

  const variantStyles = {
    primary:
      'bg-[#2d2d2d] text-white hover:bg-[#1a1a1a] active:bg-[#000000] shadow-sm border border-[#2d2d2d]',
    secondary:
      'bg-[#f4f3f0] text-[#1a1a1a] hover:bg-[#eae8e3] border border-[#e2e0d8] shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)]',
    outline:
      'bg-white text-[#2d2d2d] border border-[#e2e0d8] hover:bg-[#faf9f6] shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)]',
    danger:
      'bg-[#dc2626] text-white hover:bg-[#b91c1c] active:bg-[#991b1b] shadow-sm border border-[#dc2626]'
  }

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="animate-spin w-4 h-4" />}
      {children}
    </button>
  )
}
