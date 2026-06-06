import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

let authListenerStarted = false;

async function fetchProfile(user: any) {
  const store = useAuthStore.getState();
  store.setLoading(true);

  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, avatar_url')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    
    setTimeout(async () => {
      const retry = await supabase.from('profiles').select('*').eq('id', user.id).single() as any;
      if (retry.data) {
        useAuthStore.getState().setAuth(user, retry.data);
      } else {
        
        
        useAuthStore.getState().setAuth(user, {
          id: user.id,
          role: (user.user_metadata?.role as any) || 'tourist',
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        });
      }
    }, 1500);
  } else {
    store.setAuth(user, data);
  }
}

function startAuthListener() {
  if (authListenerStarted) return;
  authListenerStarted = true;

  
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      fetchProfile(session.user);
    } else {
      useAuthStore.getState().setAuth(null, null);
    }
  });

  
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      await fetchProfile(session.user);
    } else {
      useAuthStore.getState().setAuth(null, null);
    }
  });
}

export function useAuth() {
  const { user, profile, isLoading } = useAuthStore();

  useEffect(() => {
    startAuthListener();
  }, []);

  const signOut = async () => {
    useAuthStore.getState().setLoading(true);
    await supabase.auth.signOut();
    useAuthStore.getState().setAuth(null, null);
  };

  return { user, profile, isLoading, signOut };
}
