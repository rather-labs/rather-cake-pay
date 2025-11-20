import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates a Supabase client for server-side usage.
 * Supports both hosted Supabase and local Supabase (via Supabase CLI).
 * 
 * Configuration priority:
 * 1. Use NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY if provided (hosted Supabase)
 * 2. Fall back to local Supabase defaults (http://localhost:54321) if USE_LOCAL_SUPABASE is true
 * 3. Throw error if neither is configured
 */
export async function createClient() {
  const cookieStore = await cookies()

  // Check if we should use local Supabase
  const useLocalSupabase = process.env.NEXT_PUBLIC_USE_LOCAL_SUPABASE === 'true'
  
  // Get Supabase URL - prefer environment variable, fallback to local if enabled
  const supabaseUrl = 
    process.env.NEXT_PUBLIC_SUPABASE_URL || 
    (useLocalSupabase ? 'http://localhost:54321' : null)
  
  // Get Supabase anon key - prefer environment variable, fallback to local default if enabled
  const supabaseAnonKey = 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
    (useLocalSupabase ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' : null)

  // Debug logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Supabase Server Client] Configuration:', {
      useLocalSupabase,
      supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      envVar: process.env.NEXT_PUBLIC_USE_LOCAL_SUPABASE,
    })
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, ' +
      'or set NEXT_PUBLIC_USE_LOCAL_SUPABASE=true to use local Supabase (requires Supabase CLI running locally).'
    )
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}
