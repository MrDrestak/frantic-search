'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { authService, guestService } from '@/services/store';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  guest: { display_name: string } | null;
  isAdmin: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  signInAsGuest: (displayName: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [guest, setGuest] = useState<{ display_name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setGuest(guestService.get());

    const unsubscribe = authService.onAuthStateChange((profile) => {
      setUser(profile);
      if (profile) {
        setGuest(null);
        guestService.clear();
        authService.updateLastLogin(profile.id);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function signInWithGoogle() {
    await authService.signInWithGoogle();
  }

  async function signOut() {
    await authService.signOut();
    setUser(null);
  }

  function signInAsGuest(displayName: string) {
    guestService.set(displayName);
    setGuest({ display_name: displayName });
  }

  return (
    <AuthContext.Provider
      value={{ user, guest, isAdmin: user?.is_admin ?? false, loading, signInWithGoogle, signOut, signInAsGuest }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
