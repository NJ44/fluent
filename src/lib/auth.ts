import { supabase } from './supabase';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  name: string;
  email: string;
  password: string;
  // company field deliberately omitted
}

function transformSupabaseUser(supabaseUser: {
  id: string;
  email?: string | null;
  created_at: string;
  user_metadata?: { name?: string };
}): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    name: supabaseUser.user_metadata?.name || '',
    createdAt: supabaseUser.created_at,
  };
}

export async function signup(credentials: SignupCredentials): Promise<User> {
  const { data, error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      data: {
        name: credentials.name,
      },
    },
  });

  if (error) throw error;
  if (!data.user) throw new Error('Signup failed — no user returned');

  return transformSupabaseUser(data.user);
}

export async function login(credentials: LoginCredentials): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) throw error;
  if (!data.user) throw new Error('Login failed — no user returned');

  return transformSupabaseUser(data.user);
}

export async function logout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return transformSupabaseUser(data.user);
}

export function onAuthStateChange(
  callback: (user: User | null) => void
): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      callback(transformSupabaseUser(session.user));
    } else {
      callback(null);
    }
  });

  return () => subscription.unsubscribe();
}

export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}
