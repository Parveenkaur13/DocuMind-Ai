import { useEffect, useState, type ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { AuthContext, type AuthContextValue } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthContextValue['session']>(null);
  const [isGuest, setIsGuest] = useState(() => {
    try {
      const stored = localStorage.getItem('documind_guest');
      if (stored === 'false') return false;
      return true; // Default to immediate working mode
    } catch {
      return true;
    }
  });
  const [loading, setLoading] = useState(() => isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    supabase.auth.getSession()
      .then(({ data }) => {
        clearTimeout(timer);
        setSession(data.session);
        setLoading(false);
      })
      .catch(() => {
        clearTimeout(timer);
        setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        setIsGuest(false);
        try {
          localStorage.removeItem('documind_guest');
        } catch {
          // ignore
        }
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      setIsGuest(false);
      try {
        localStorage.removeItem('documind_guest');
      } catch {
        // ignore
      }
    }
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (!error) {
      setIsGuest(false);
      try {
        localStorage.removeItem('documind_guest');
      } catch {
        // ignore
      }
    }
    return { error: error?.message ?? null };
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    try {
      localStorage.setItem('documind_guest', 'true');
    } catch {
      // ignore
    }
  };

  const signOut = async () => {
    setIsGuest(false);
    try {
      localStorage.setItem('documind_guest', 'false');
    } catch {
      // ignore
    }
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  };

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    isGuest,
    signIn,
    signUp,
    continueAsGuest,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
