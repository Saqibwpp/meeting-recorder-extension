import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '../lib/react-query'
import { AuthProvider } from '../features/auth/context/AuthContext'

interface AppProviderProps {
  children: React.ReactNode
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}
