import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session, SupabaseClient } from '@supabase/supabase-js';

const db = supabase as unknown as SupabaseClient;

export interface Profile {
  id: string;
  user_id: string;
  channel_name: string;
  avatar_url: string | null;
  is_online: boolean;
  last_seen: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await db
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (data) setProfile(data as Profile);
      return data as Profile | null;
    } catch {
      return null;
    }
  }, []);

  const updateOnlineStatus = useCallback(async (userId: string, online: boolean) => {
    try {
      await db
        .from('profiles')
        .update({ is_online: online, last_seen: new Date().toISOString() })
        .eq('user_id', userId);
    } catch {}
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
          await updateOnlineStatus(session.user.id, true);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        updateOnlineStatus(session.user.id, true);
      }
      setLoading(false);
    });

    const handleBeforeUnload = () => {
      if (user) updateOnlineStatus(user.id, false);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const signUp = async (email: string, password: string, channelName: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.user) {
      const { error: pErr } = await db.from('profiles').insert({
        user_id: data.user.id,
        channel_name: channelName,
      });
      if (pErr) throw pErr;
      await fetchProfile(data.user.id);
    }
    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    if (user) await updateOnlineStatus(user.id, false);
    await db.auth.signOut();
    setProfile(null);
  };

  return { user, session, profile, loading, signUp, signIn, signOut, fetchProfile, setProfile };
}
