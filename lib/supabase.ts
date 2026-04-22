import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// In-memory storage fallback for native (Expo Go doesn't ship the new AsyncStorage native module).
// Sessions won't survive app restarts in Expo Go but the app will function normally.
const memoryStore: Record<string, string> = {};

const nativeStorage = {
  getItem: async (key: string) => memoryStore[key] ?? null,
  setItem: async (key: string, value: string) => { memoryStore[key] = value; },
  removeItem: async (key: string) => { delete memoryStore[key]; },
};

const webStorage = {
  getItem: async (key: string) => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItem: async (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch {}
  },
  removeItem: async (key: string) => {
    try { localStorage.removeItem(key); } catch {}
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? webStorage : nativeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
