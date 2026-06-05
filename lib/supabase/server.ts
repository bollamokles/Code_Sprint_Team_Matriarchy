import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // The "setAll" method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  )

  const demoUserId = process.env.NEXT_PUBLIC_DEMO_USER_ID || 'Rafi_vai_shera'
  const hasDemoCookie = cookieStore.get('demo_user_id')?.value === demoUserId

  const mockUser = {
    id: demoUserId,
    email: 'rafi_vai@gmail.com',
    user_metadata: {
      full_name: 'Rafi (Judge)',
      skills: [],
    },
    aud: 'authenticated',
    role: 'authenticated',
  }

  // Override auth methods
  const authOverride = {
    ...client.auth,
    getUser: async () => {
      if (hasDemoCookie) {
        return { data: { user: mockUser }, error: null }
      }
      return client.auth.getUser()
    },
    getSession: async () => {
      if (hasDemoCookie) {
        return {
          data: {
            session: {
              user: mockUser,
              access_token: 'mock-token',
              refresh_token: 'mock-refresh-token',
              expires_in: 3600,
              token_type: 'bearer',
            },
          },
          error: null,
        }
      }
      return client.auth.getSession()
    },
  }

  return new Proxy(client, {
    get(target, prop) {
      if (prop === 'auth') {
        return authOverride
      }
      return Reflect.get(target, prop)
    },
  })
}

