/**
 * Serviço de Autenticação
 * Gerencia login, signup e sessão do usuário
 */

import { supabase } from '@/lib/supabase';
import { AuthError, Session, User } from '@supabase/supabase-js';

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

/**
 * Cadastro com email e senha
 * Sem confirmação de email no MVP
 */
export async function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
        emailRedirectTo: undefined, // Sem confirmação por email no MVP
      },
    });

    return {
      user: data.user,
      session: data.session,
      error,
    };
  } catch (error) {
    return {
      user: null,
      session: null,
      error: error as AuthError,
    };
  }
}

/**
 * Login com email e senha
 */
export async function signIn(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return {
      user: data.user,
      session: data.session,
      error,
    };
  } catch (error) {
    return {
      user: null,
      session: null,
      error: error as AuthError,
    };
  }
}

/**
 * Logout
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Obtém sessão atual
 */
export async function getSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Obtém usuário atual
 */
export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Recuperação de senha
 */
export async function resetPassword(
  email: string
): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  return { error };
}

/**
 * Atualiza senha
 */
export async function updatePassword(
  newPassword: string
): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { error };
}
