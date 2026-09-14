import React from 'react'
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react'

interface AlertProps {
  type?: 'warning' | 'error' | 'info' | 'success'
  title?: string
  children: React.ReactNode
  className?: string
}

export const Alert: React.FC<AlertProps> = ({ type = 'info', title, children, className = '' }) => {
  const styles = {
    warning: 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]',
    error: 'bg-[#fef2f2] border-[#fecaca] text-[#b91c1c]',
    info: 'bg-[#eff6ff] border-[#bfdbfe] text-[#1e40af]',
    success: 'bg-[#f0fdf4] border-[#bbf7d0] text-[#166534]'
  }

  const icons = {
    warning: <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#d97706]" />,
    error: <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#dc2626]" />,
    info: <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#2563eb]" />,
    success: <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#16a34a]" />
  }

  return (
    <div
      className={`flex items-start gap-3 p-3.5 rounded-lg border text-xs leading-relaxed ${styles[type]} ${className}`}
    >
      {icons[type]}
      <div className="flex-1">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  )
}
