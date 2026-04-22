import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const storage = Platform.OS !== 'web' ? createAsyncStorage('supabase') : undefined;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
