import { createClient } from '@supabase/supabase-js';

const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Check if credentials are set and not using default placeholders
export const isConfigured = 
  !!(envUrl && 
  envUrl !== '' && 
  envUrl !== 'YOUR_SUPABASE_URL' && 
  envKey && 
  envKey !== '' && 
  envKey !== 'YOUR_SUPABASE_ANON_KEY');

if (!isConfigured) {
  console.warn(
    'Supabase: URL or Anon Key is missing or using default placeholders. ' +
    'Please configure them in your .env.local file.'
  );
}

// Gunakan proxy lokal di browser untuk menghindari masalah CORS/blokir internet
const isBrowser = typeof window !== 'undefined';
const supabaseUrl = isBrowser
  ? `${window.location.origin}/api/supabase-proxy`
  : envUrl;

// Inisialisasi Supabase client
console.log("Supabase Client initialized with URL:", isConfigured ? supabaseUrl : 'placeholder-url');
export const supabase = createClient(
  isConfigured ? supabaseUrl : 'https://placeholder-project-id.supabase.co',
  isConfigured ? envKey : 'placeholder-anon-key'
);
