import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazily initialize the clients using a Proxy. This prevents static compilation
// failures in next build when environment variables are not present.
let _supabase: SupabaseClient | null = null
export const supabase: SupabaseClient = new Proxy({} as any, {
  get(target, prop) {
    if (!_supabase) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy-url.supabase.co'
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-anon-key'
      _supabase = createClient(url, key)
    }
    return Reflect.get(_supabase, prop)
  }
})

let _supabaseAdmin: SupabaseClient | null = null
export const supabaseAdmin: SupabaseClient = new Proxy({} as any, {
  get(target, prop) {
    if (!_supabaseAdmin) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy-url.supabase.co'
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-service-role-key'
      _supabaseAdmin = createClient(url, key)
    }
    return Reflect.get(_supabaseAdmin, prop)
  }
})
