import { User } from 'firebase/auth'

export interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, pass: string) => Promise<User>
  register: (email: string, pass: string) => Promise<User>
  loginWithGoogle: () => Promise<User>
  logout: () => Promise<void>
}
