/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { requireSupabase, supabase } from "../../lib/supabase";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: false,
  signIn: async () => {},
  signUp: async () => false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(() => Boolean(supabase));

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const client = requireSupabase();
    let mounted = true;

    void client.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) {
        setSession(null);
      } else {
        setSession(data.session);
      }
      setLoading(false);
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    loading,

    signIn: async (email, password) => {
      const { data, error } = await requireSupabase().auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Set the session directly from the successful response. This prevents
      // ProtectedRoute from seeing a stale null session during navigation
      // before Supabase's auth-state listener fires.
      setSession(data.session);
      setLoading(false);
    },

    signUp: async (email, password, fullName) => {
      const { data, error } = await requireSupabase().auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (error) throw error;

      // With email confirmation enabled Supabase intentionally returns a null
      // session. In that case the registration page must wait for confirmation.
      setSession(data.session);
      setLoading(false);
      return !data.session;
    },

    signOut: async () => {
      const { error } = await requireSupabase().auth.signOut();
      if (error) throw error;
      setSession(null);
      setLoading(false);
    },
  }), [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
