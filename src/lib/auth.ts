/**
 * Auth Layer — Supabase Auth (production) with localStorage fallback (offline)
 *
 * Flow:
 * 1. Register: supabase.auth.signUp → create user in 'users' table → set session
 * 2. Login: supabase.auth.signInWithPassword → load user from 'users' table → set session
 * 3. Session restore: supabase.auth.getSession → load user from 'users' table
 * 4. Offline fallback: if Supabase unreachable, use localStorage auth (legacy)
 */

import { supabase, isOnline } from './supabase';
import { db, type UserData } from './store';
import { upsertUser } from './supabaseSync';

export interface AuthSession {
  id: string;
  name: string;
  role: string;
  email: string;
}

export interface AuthResult {
  success: boolean;
  session?: AuthSession;
  error?: string;
}

/**
 * Register a new user with Supabase Auth + users table
 */
export async function authRegister(
  name: string,
  email: string,
  password: string,
  role: string
): Promise<AuthResult> {
  const emailLower = email.toLowerCase().trim();

  // Try Supabase Auth first
  if (isOnline()) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: emailLower,
        password,
        options: {
          data: { name, role }, // stored in auth.users metadata
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        // If user already registered in Auth, try to sign in instead
        if (error.message.includes('already registered')) {
          return { success: false, error: 'Email ja cadastrado' };
        }
        // If Auth is not enabled or table doesn't exist, fall through to localStorage
        console.warn('[Auth] Supabase Auth error, using localStorage fallback:', error.message);
        return localRegister(name, emailLower, password, role);
      }

      // Auth user created — now create in users table
      const userId = data.user?.id || `u_${Date.now()}`;
      const plan = role === 'Setter' || role === 'Social Seller' ? 'SETTER' : role === 'Founder' ? 'FOUNDER' : 'PARTNER';

      const userData: UserData = {
        id: userId,
        name: name.trim(),
        email: emailLower,
        password: '***', // don't store plain password when using Supabase Auth
        role,
        plan,
        active: true,
        createdAt: Date.now(),
      };

      // Save to users table + localStorage
      await upsertUser(userData);
      const users = db.get<UserData[]>('ops_users') || [];
      if (!users.find(u => u.email === emailLower)) {
        users.push(userData);
        db.set('ops_users', users);
      }

      return {
        success: true,
        session: { id: userId, name: userData.name, role, email: emailLower },
      };
    } catch (err) {
      console.warn('[Auth] Supabase error, falling back to localStorage:', err);
      return localRegister(name, emailLower, password, role);
    }
  }

  // Offline: use localStorage
  return localRegister(name, emailLower, password, role);
}

/**
 * Sign in with Supabase Auth
 */
export async function authLogin(email: string, password: string): Promise<AuthResult> {
  const emailLower = email.toLowerCase().trim();

  if (isOnline()) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailLower,
        password,
      });

      if (!error && data.user) {
        // Find user in users table
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('email', emailLower)
          .eq('active', true)
          .single();

        if (userData) {
          return {
            success: true,
            session: {
              id: userData.id,
              name: userData.name,
              role: userData.role,
              email: userData.email,
            },
          };
        }

        // User in Auth but not in users table — check metadata
        const meta = data.user.user_metadata;
        const session: AuthSession = {
          id: data.user.id,
          name: meta?.name || emailLower.split('@')[0],
          role: meta?.role || 'Setter',
          email: emailLower,
        };
        return { success: true, session };
      }

      // Auth failed — try localStorage fallback (maybe user was created before Auth was enabled)
      if (error) {
        console.warn('[Auth] Supabase signIn failed, trying localStorage:', error.message);
        return localLogin(emailLower, password);
      }
    } catch (err) {
      console.warn('[Auth] Supabase error, falling back to localStorage:', err);
      return localLogin(emailLower, password);
    }
  }

  // Offline: localStorage auth
  return localLogin(emailLower, password);
}

/**
 * Restore session from Supabase Auth token (auto-login on refresh)
 */
export async function authRestoreSession(): Promise<AuthSession | null> {
  // First check Supabase Auth session
  if (isOnline()) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const email = session.user.email || '';
        // Find in users table
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .eq('active', true)
          .single();

        if (userData) {
          return {
            id: userData.id,
            name: userData.name,
            role: userData.role,
            email: userData.email,
          };
        }

        // Fallback to metadata
        const meta = session.user.user_metadata;
        return {
          id: session.user.id,
          name: meta?.name || email.split('@')[0],
          role: meta?.role || 'Setter',
          email,
        };
      }
    } catch {
      // Supabase unavailable
    }
  }

  // Fallback: check localStorage session
  try {
    const saved = localStorage.getItem('vantagem_session');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

/**
 * Logout — clear Supabase Auth + localStorage
 */
export async function authLogout(): Promise<void> {
  try {
    if (isOnline()) {
      await supabase.auth.signOut();
    }
  } catch {
    // ignore
  }
  localStorage.removeItem('vantagem_session');
}

// ── localStorage fallbacks (offline or Supabase Auth not configured) ──

function localRegister(name: string, email: string, password: string, role: string): AuthResult {
  const users = db.get<UserData[]>('ops_users') || [];
  if (users.find(u => u.email === email)) {
    return { success: false, error: 'Email ja cadastrado' };
  }
  const plan = role === 'Setter' || role === 'Social Seller' ? 'SETTER' : role === 'Founder' ? 'FOUNDER' : 'PARTNER';
  const newUser: UserData = {
    id: 'u_' + Date.now(),
    name: name.trim(),
    email,
    password,
    role,
    plan,
    active: true,
    createdAt: Date.now(),
  };
  users.push(newUser);
  db.set('ops_users', users);
  return {
    success: true,
    session: { id: newUser.id, name: newUser.name, role: newUser.role, email: newUser.email },
  };
}

function localLogin(email: string, password: string): AuthResult {
  const users = db.get<UserData[]>('ops_users') || [];
  const user = users.find(u => u.email === email && u.password === password && u.active);
  if (!user) {
    return { success: false, error: 'Email ou senha incorretos' };
  }
  return {
    success: true,
    session: { id: user.id, name: user.name, role: user.role, email: user.email },
  };
}
