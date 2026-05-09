// src/lib/supabase.ts
//
// This file creates the Supabase client used everywhere in the app.
// It handles:
//   • Persisting the user session to AsyncStorage (so they stay logged in)
//   • Auto-refreshing tokens before they expire
//   • URL polyfill required for React Native
//
// Usage anywhere in the app:
//   import { supabase } from '@/lib/supabase';
//   const { data, error } = await supabase.from('destinations').select('*');

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import type { Database } from '@/types/database'; // Will be auto-generated later

// Read credentials from .env (must be prefixed EXPO_PUBLIC_ to be available in app)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Check .env file has EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // false for React Native (only true for web)
  },
});

// Refresh the auth session whenever the app comes back to the foreground.
// Without this, a user who leaves the app for hours can come back to a
// logged-out state. This single line fixes that for both iOS and Android.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

// ────────────────────────────────────────────────────────────────────────────
// Helper: get the current user (returns null if not logged in)
// ────────────────────────────────────────────────────────────────────────────
export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// ────────────────────────────────────────────────────────────────────────────
// Helper: upload a file to Supabase Storage and return the public URL
// ────────────────────────────────────────────────────────────────────────────
export async function uploadFile(
  bucket: 'avatars' | 'destinations' | 'lodges' | 'kyc-documents' | 'chat-attachments',
  path: string,
  file: Blob | ArrayBuffer | FormData,
  contentType = 'image/jpeg'
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType, upsert: true });

  if (error) throw error;

  // For public buckets, return the public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return publicUrl;
}
