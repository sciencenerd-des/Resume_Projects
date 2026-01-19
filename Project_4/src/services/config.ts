/**
 * Runtime Config Service
 * Fetches configuration from server at runtime
 */

export interface RuntimeConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

let cachedConfig: RuntimeConfig | null = null;
let fetchPromise: Promise<RuntimeConfig> | null = null;

/**
 * Fetch runtime configuration from server
 * Results are cached after first fetch
 */
export async function fetchConfig(): Promise<RuntimeConfig> {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  // Dedupe concurrent fetches
  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const response = await fetch('/api/config');
      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.status}`);
      }
      const config = await response.json();
      cachedConfig = config;
      return config;
    } catch (error) {
      console.error('[Config] Failed to fetch runtime config:', error);
      // Return empty config as fallback
      return {
        supabaseUrl: '',
        supabaseAnonKey: '',
      };
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

/**
 * Get cached config synchronously (returns null if not yet fetched)
 */
export function getConfig(): RuntimeConfig | null {
  return cachedConfig;
}
