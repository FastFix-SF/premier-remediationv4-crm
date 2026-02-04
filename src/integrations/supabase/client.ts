// Supabase client configuration
// Uses Vite environment variables set during deployment
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Read from Vite environment variables (set in Vercel during deployment)
// Fallback to empty strings to avoid build errors - proper values must be set in production
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const TENANT_ID = import.meta.env.VITE_TENANT_ID || "";

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.warn('[Supabase] Missing environment variables VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
}

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global: {
    headers: {
      // Include tenant ID for multi-tenant edge functions
      ...(TENANT_ID ? { 'x-tenant-id': TENANT_ID } : {}),
    },
  },
});
