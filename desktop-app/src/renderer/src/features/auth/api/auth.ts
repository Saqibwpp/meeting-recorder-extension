import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCustomToken,
  signOut as firebaseSignOut,
  User
} from 'firebase/auth'
import { auth } from '../../../lib/firebase'

export const loginWithEmail = async (email: string, pass: string): Promise<User> => {
  const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass)
  return userCredential.user
}

export const registerWithEmail = async (email: string, pass: string): Promise<User> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass)
  return userCredential.user
}

export const loginWithBrowserOAuth = async (): Promise<User> => {
  const customToken = await window.api.loginWithBrowser()
  const userCredential = await signInWithCustomToken(auth, customToken)
  return userCredential.user
}

export const logoutUser = async (): Promise<void> => {
  await firebaseSignOut(auth)
}
