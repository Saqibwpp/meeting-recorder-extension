import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div
      className={`bg-white rounded-xl border border-[#e2e0d8] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
