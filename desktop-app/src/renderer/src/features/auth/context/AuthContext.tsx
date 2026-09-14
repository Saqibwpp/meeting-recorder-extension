import React, { useEffect, useState } from 'react'
import { User, onAuthStateChanged } from 'firebase/auth'
import { auth } from '../../../lib/firebase'
import { loginWithEmail, registerWithEmail, loginWithBrowserOAuth, logoutUser } from '../api/auth'
import { AuthContextType } from '../types'
import { AuthContext } from './context'

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const value: AuthContextType = {
    user,
    loading,
    login: loginWithEmail,
    register: registerWithEmail,
    loginWithGoogle: loginWithBrowserOAuth,
    logout: logoutUser
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
