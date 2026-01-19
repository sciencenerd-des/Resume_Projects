import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { initSupabase, getSupabase } from '../services/supabase';

interface SupabaseContextValue {
  supabase: SupabaseClient;
  isReady: boolean;
}

const SupabaseContext = createContext<SupabaseContextValue | null>(null);

interface SupabaseProviderProps {
  children: ReactNode;
}

/**
 * Provider that initializes Supabase with runtime config
 * Must wrap AuthProvider and other components that use Supabase
 */
export function SupabaseProvider({ children }: SupabaseProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initSupabase()
      .then((client) => {
        setSupabase(client);
        setIsReady(true);
      })
      .catch((err) => {
        console.error('[SupabaseProvider] Failed to initialize:', err);
        setError(err.message);
      });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-red-600 mb-2">
            Configuration Error
          </h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!isReady || !supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <SupabaseContext.Provider value={{ supabase, isReady }}>
      {children}
    </SupabaseContext.Provider>
  );
}

/**
 * Hook to access Supabase client
 * Must be used within SupabaseProvider
 */
export function useSupabaseClient(): SupabaseClient {
  const context = useContext(SupabaseContext);
  if (!context) {
    // Fallback for components that might render before provider
    try {
      return getSupabase();
    } catch {
      throw new Error('useSupabaseClient must be used within SupabaseProvider');
    }
  }
  return context.supabase;
}
