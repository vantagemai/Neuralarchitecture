import { createClient } from '@supabase/supabase-js';

// Reads credentials from public/config.js (loaded by the browser)
// Falls back to Vite env vars for CI/local development
const url = (window as Window & { SUPABASE_URL?: string }).SUPABASE_URL
  || import.meta.env.VITE_SUPABASE_URL
  || '';

const key = (window as Window & { SUPABASE_ANON_KEY?: string }).SUPABASE_ANON_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY
  || '';

export const supabase = createClient(url, key);

export interface LessonUpdate {
  id: string;
  track: string;
  video_id: string;
  material: string[];
  updated_at: string;
}
