import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createSupabaseServerClient() {
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
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Called from a Server Component without mutable cookies — safe to ignore.
          }
        },
      },
    }
  )

  const demoUserId = cookieStore.get('demo_user_id')?.value

  // Helper to resolve mock user from cookie
  const getMockUser = () => {
    if (!demoUserId) return null
    
    let fullName = 'Rafi (Judge)'
    let email = 'rafi_vai@gmail.com'
    if (demoUserId === 'sarah_chen_demo') {
      fullName = 'Sarah Chen'
      email = 'sarah.chen@demo.com'
    } else if (demoUserId === 'marcus_johnson_demo') {
      fullName = 'Marcus Johnson'
      email = 'marcus.j@demo.com'
    } else if (demoUserId === 'emily_rodriguez_demo') {
      fullName = 'Emily Rodriguez'
      email = 'emily.r@demo.com'
    }

    return {
      id: demoUserId,
      email,
      user_metadata: {
        full_name: fullName,
        skills: [],
      },
      aud: 'authenticated',
      role: 'authenticated',
    }
  }

  const mockUser = getMockUser()

  // Override auth methods
  const authOverride = {
    ...client.auth,
    getUser: async () => {
      if (mockUser) {
        return { data: { user: mockUser }, error: null }
      }
      return client.auth.getUser()
    },
    getSession: async () => {
      if (mockUser) {
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

