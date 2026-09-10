import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase-client';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getClientAuth();
    if (!auth) {
      setTimeout(() => setLoading(false), 0);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { user, loading, setUser };
}
