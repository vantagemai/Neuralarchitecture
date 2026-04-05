import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bjssvsguhjckiewxzuzz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqc3N2c2d1aGpja2lld3h6dXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNzc0MjEsImV4cCI6MjA5MDk1MzQyMX0.siGUGVUzLktl_IG1vJ_hGWzt03fobXwmIGUgbkoH0Bg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Track connection status
let _online = false;
let _initialized = false;

export function isOnline(): boolean { return _online; }
export function isInitialized(): boolean { return _initialized; }

// Test connection on startup
export async function initSupabase(): Promise<boolean> {
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    _online = !error;
    _initialized = true;
    if (error) console.warn('[Supabase] Offline mode — tables may not exist yet:', error.message);
    else console.log('[Supabase] Connected');
    return _online;
  } catch {
    _online = false;
    _initialized = true;
    console.warn('[Supabase] Offline mode — connection failed');
    return false;
  }
}

// Re-export for convenience
export type { SupabaseClient } from '@supabase/supabase-js';
