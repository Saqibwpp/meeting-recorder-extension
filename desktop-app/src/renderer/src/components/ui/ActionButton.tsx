import React from 'react'
import { LucideIcon } from 'lucide-react'

export interface ActionButtonProps {
  children: React.ReactNode
  icon?: LucideIcon
  muted?: boolean
  onClick?: () => void
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  icon: Icon,
  muted = false,
  onClick,
  disabled = false,
  className = '',
  type = 'button'
}) => {
  return (
    <button
      type={type}
      className={`${muted ? 'action-button-muted' : 'action-button'} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />}
      {children}
    </button>
  )
}
