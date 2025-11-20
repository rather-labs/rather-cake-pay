import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Updates the session for middleware.
 * Supports both hosted Supabase and local Supabase (via Supabase CLI).
 */
export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  })

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

  if (!supabaseUrl || !supabaseAnonKey) {
    // In middleware, we don't want to throw errors that break the request
    // Just return the response without auth refresh
    console.warn(
      'Missing Supabase credentials in middleware. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, ' +
      'or set NEXT_PUBLIC_USE_LOCAL_SUPABASE=true to use local Supabase.'
    )
    return supabaseResponse
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value)
          supabaseResponse.cookies.set(name, value, options)
        }
      },
    },
  })

  // Refreshing the auth token
  await supabase.auth.getUser()

  return supabaseResponse
}
