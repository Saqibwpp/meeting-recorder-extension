import React, { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block font-mono text-[11px] uppercase tracking-wider text-[#737373]"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#999999] transition-all focus:outline-none focus:ring-1 ${
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
              : 'border-[#e2e0d8] focus:border-[#2d2d2d] focus:ring-[#2d2d2d]'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        {!error && helperText && <p className="text-xs text-[#737373] mt-1">{helperText}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
