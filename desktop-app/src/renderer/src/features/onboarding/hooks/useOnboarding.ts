import { useState, useCallback } from 'react'

const ONBOARDING_STORAGE_KEY = 'embrace_onboarding_completed'

export interface UseOnboardingReturn {
  isOpen: boolean
  hasCompleted: boolean
  openOnboarding: () => void
  closeOnboarding: () => void
  completeOnboarding: () => void
}

export function useOnboarding(): UseOnboardingReturn {
  const [hasCompleted, setHasCompleted] = useState<boolean>(() => {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true'
  })

  // Open automatically if not completed yet
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) !== 'true'
  })

  const openOnboarding = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeOnboarding = useCallback(() => {
    setIsOpen(false)
  }, [])

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
    setHasCompleted(true)
    setIsOpen(false)
  }, [])

  return {
    isOpen,
    hasCompleted,
    openOnboarding,
    closeOnboarding,
    completeOnboarding
  }
}
