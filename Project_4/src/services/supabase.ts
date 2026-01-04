import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { fetchConfig } from './config';

let supabaseInstance: SupabaseClient | null = null;
let initPromise: Promise<SupabaseClient> | null = null;

/**
 * Initialize Supabase client with runtime config
 * This should be called once at app startup
 */
export async function initSupabase(): Promise<SupabaseClient> {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const config = await fetchConfig();

    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      console.warn('[Supabase] Missing credentials. Running in mock mode.');
      // Create with placeholder values for development
      supabaseInstance = createClient(
        'https://placeholder.supabase.co',
        'placeholder-key'
      );
    } else {
      supabaseInstance = createClient(config.supabaseUrl, config.supabaseAnonKey);
    }

    return supabaseInstance;
  })();

  return initPromise;
}

/**
 * Get the initialized Supabase client
 * Throws if not initialized - use initSupabase() first
 */
export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    throw new Error('Supabase not initialized. Call initSupabase() first.');
  }
  return supabaseInstance;
}

/**
 * Legacy export for backwards compatibility
 * Components should migrate to useSupabase hook
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!supabaseInstance) {
      throw new Error(
        'Supabase not initialized. Wrap your app with SupabaseProvider.'
      );
    }
    return (supabaseInstance as unknown as Record<string | symbol, unknown>)[prop];
  },
});
