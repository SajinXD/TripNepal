import { create } from 'zustand';
import { User } from '@supabase/supabase-js';

type Profile = {
  id: string;
  role: 'tourist' | 'guide' | 'admin';
  full_name: string;
  avatar_url?: string;
  is_verified?: boolean;
};

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  setAuth: (user: User | null, profile: Profile | null) => void;
  updateProfile: (updates: Partial<Profile>) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  setAuth: (user, profile) => set({ user, profile, isLoading: false }),
  updateProfile: (updates) => set((state) => ({ 
    profile: state.profile ? { ...state.profile, ...updates } : null 
  })),
  setLoading: (isLoading) => set({ isLoading }),
}));
