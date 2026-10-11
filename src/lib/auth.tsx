import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, type Profile } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isGuest: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role: 'owner' | 'staff') => Promise<{ error: string | null }>;
  signInAsGuest: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const GUEST_PROFILE: Profile = {
  id: 'guest',
  email: 'guest@local',
  full_name: 'Workshop Staff',
  role: 'owner',
  created_at: new Date().toISOString(),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(() => localStorage.getItem('gt-guest') === 'true');

  useEffect(() => {
    const savedUser = localStorage.getItem('gt-auth-user');
    if (savedUser) {
      try {
        setProfile(JSON.parse(savedUser));
        setLoading(false);
        return;
      } catch {
        localStorage.removeItem('gt-auth-user');
      }
    }

    if (isGuest) {
      setProfile(GUEST_PROFILE);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        loadProfile(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        loadProfile(newSession.user.id);
      } else {
        if (!localStorage.getItem('gt-auth-user')) {
          setProfile(null);
          setLoading(false);
        }
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [isGuest]);

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setProfile(data as Profile | null);
    setLoading(false);
  }

  async function signIn(email: string, password: string) {
    const cleanEmail = email.trim();
    if (cleanEmail.toLowerCase() === 'germantech@gmail.com' && password === 'Germantech') {
      const ownerProfile: Profile = {
        id: 'owner-germantech',
        email: 'Germantech@gmail.com',
        full_name: 'German Tech Admin',
        role: 'owner',
        created_at: new Date().toISOString(),
      };
      localStorage.setItem('gt-auth-user', JSON.stringify(ownerProfile));
      setProfile(ownerProfile);
      setIsGuest(false);
      // Attempt supabase login in parallel if configured
      supabase.auth.signInWithPassword({ email: cleanEmail, password }).catch(() => {});
      return { error: null };
    }
    const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    return { error: error?.message ?? null };
  }

  async function signUp(email: string, password: string, fullName: string, role: 'owner' | 'staff') {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });
    return { error: error?.message ?? null };
  }

  function signInAsGuest() {
    localStorage.setItem('gt-guest', 'true');
    setIsGuest(true);
    setProfile(GUEST_PROFILE);
    setSession(null);
  }

  async function signOut() {
    localStorage.removeItem('gt-guest');
    localStorage.removeItem('gt-auth-user');
    setIsGuest(false);
    setProfile(null);
    await supabase.auth.signOut().catch(() => {});
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, isGuest, signIn, signUp, signInAsGuest, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
