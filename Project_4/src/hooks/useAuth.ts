import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../services/supabase';
import type { User, AuthSession } from '../types';

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await getSupabase().auth.getUser();
      return user as User | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data: { session } } = await getSupabase().auth.getSession();
      return session as AuthSession | null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const signIn = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { error } = await getSupabase().auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['session'] });
    },
  });

  const signUp = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { error } = await getSupabase().auth.signUp({ email, password });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['session'] });
    },
  });

  const signOut = useMutation({
    mutationFn: async () => {
      const { error } = await getSupabase().auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });

  return {
    user,
    session,
    isLoading: userLoading || sessionLoading,
    signIn,
    signUp,
    signOut,
  };
}
