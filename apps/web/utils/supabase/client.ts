import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const memoryStore = new Map<string, string>();

const getStorage = () => {
  if (typeof window === "undefined") {
    return undefined;
  }

  return {
    getItem: (key: string) => {
      try {
        const sessionValue = window.sessionStorage.getItem(key);
        if (sessionValue !== null) return sessionValue;
      } catch {
        // Ignore storage access failures.
      }
      try {
        const localValue = window.localStorage.getItem(key);
        if (localValue !== null) return localValue;
      } catch {
        // Ignore storage access failures.
      }
      return memoryStore.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      memoryStore.set(key, value);
      try {
        window.sessionStorage.setItem(key, value);
      } catch {
        // Ignore storage write failures.
      }
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Ignore storage write failures.
      }
    },
    removeItem: (key: string) => {
      memoryStore.delete(key);
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        // Ignore storage removal failures.
      }
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Ignore storage removal failures.
      }
    },
  };
};

export const createClient = () =>
  createBrowserClient(supabaseUrl!, supabaseKey!, {
    auth: {
      storage: getStorage(),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
