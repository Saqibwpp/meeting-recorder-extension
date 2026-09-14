import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { FIREBASE_CONFIG } from '../config/env'

const app = !getApps().length ? initializeApp(FIREBASE_CONFIG) : getApp()
export const auth = getAuth(app)
export { app }
