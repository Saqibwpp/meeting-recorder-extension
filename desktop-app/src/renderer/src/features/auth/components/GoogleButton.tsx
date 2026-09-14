import React from 'react'
import { Button } from '../../../components/ui/Button'

interface GoogleButtonProps {
  onClick: () => void
  isLoading?: boolean
  disabled?: boolean
  label?: string
}

export const GoogleButton: React.FC<GoogleButtonProps> = ({
  onClick,
  isLoading = false,
  disabled = false,
  label = 'Continue with Google'
}) => {
  return (
    <Button
      type="button"
      variant="outline"
      size="md"
      className="w-full flex items-center justify-center gap-3 font-medium bg-white hover:bg-[#f9f8f6] border-[#e2e0d8] text-[#1a1a1a] shadow-[0_2px_10px_-2px_rgba(0,0,0,0.03)]"
      onClick={onClick}
      isLoading={isLoading}
      disabled={disabled}
    >
      {!isLoading && (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
          <path
            fill="#EA4335"
            d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
          />
          <path
            fill="#4285F4"
            d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
          />
          <path
            fill="#FBBC05"
            d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8 0-1.3.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
          />
          <path
            fill="#34A853"
            d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
          />
        </svg>
      )}
      <span>{label}</span>
    </Button>
  )
}
