import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const demoUserId = process.env.NEXT_PUBLIC_DEMO_USER_ID || 'Rafi_vai_shera'

  // Helper to determine if demo session is active
  const isDemoActive = () => {
    if (typeof window === 'undefined') return false
    return !!localStorage.getItem('demo_user_id') || document.cookie.includes('demo_user_id=')
  }

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
      if (isDemoActive()) {
        return { data: { user: mockUser }, error: null }
      }
      return client.auth.getUser()
    },
    getSession: async () => {
      if (isDemoActive()) {
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
    onAuthStateChange: (callback: any) => {
      if (isDemoActive()) {
        setTimeout(() => {
          callback('SIGNED_IN', {
            user: mockUser,
            access_token: 'mock-token',
            refresh_token: 'mock-refresh-token',
            expires_in: 3600,
            token_type: 'bearer',
          })
        }, 0)
        return {
          data: {
            subscription: {
              unsubscribe: () => {},
            },
          },
        }
      }
      return client.auth.onAuthStateChange(callback)
    },
    signInWithPassword: async (credentials: any) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('demo_user_id', demoUserId)
        document.cookie = `demo_user_id=${demoUserId}; path=/; max-age=31536000`
      }
      return {
        data: {
          user: mockUser,
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
    },
    signUp: async (credentials: any) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('demo_user_id', demoUserId)
        document.cookie = `demo_user_id=${demoUserId}; path=/; max-age=31536000`
      }
      return {
        data: {
          user: mockUser,
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
    },
    signOut: async () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('demo_user_id')
        document.cookie = 'demo_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      }
      return { error: null }
    },
    updateUser: async (attributes: any) => {
      if (isDemoActive()) {
        if (attributes.data) {
          Object.assign(mockUser.user_metadata, attributes.data)
        }
        return { data: { user: mockUser }, error: null }
      }
      return client.auth.updateUser(attributes)
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

