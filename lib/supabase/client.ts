import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // Helper to get active demo user details
  const getMockUser = () => {
    if (typeof window === 'undefined') return null
    const id = localStorage.getItem('demo_user_id') || document.cookie.split('; ').find(row => row.trim().startsWith('demo_user_id='))?.split('=')[1]
    if (!id) return null

    const defaultDemoId = process.env.NEXT_PUBLIC_DEMO_USER_ID || 'Rafi_vai_shera'
    
    let fullName = 'Rafi (Judge)'
    let email = 'rafi_vai@gmail.com'
    if (id === 'sarah_chen_demo') {
      fullName = 'Sarah Chen'
      email = 'sarah.chen@demo.com'
    } else if (id === 'marcus_johnson_demo') {
      fullName = 'Marcus Johnson'
      email = 'marcus.j@demo.com'
    } else if (id === 'emily_rodriguez_demo') {
      fullName = 'Emily Rodriguez'
      email = 'emily.r@demo.com'
    }

    return {
      id,
      email,
      user_metadata: {
        full_name: fullName,
        skills: [],
      },
      aud: 'authenticated',
      role: 'authenticated',
    }
  }

  // Override auth methods
  const authOverride = {
    ...client.auth,
    getUser: async () => {
      const mockUser = getMockUser()
      if (mockUser) {
        return { data: { user: mockUser }, error: null }
      }
      return client.auth.getUser()
    },
    getSession: async () => {
      const mockUser = getMockUser()
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
    onAuthStateChange: (callback: any) => {
      const mockUser = getMockUser()
      if (mockUser) {
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
      const demoUserId = process.env.NEXT_PUBLIC_DEMO_USER_ID || 'Rafi_vai_shera'
      if (typeof window !== 'undefined') {
        localStorage.setItem('demo_user_id', demoUserId)
        document.cookie = `demo_user_id=${demoUserId}; path=/; max-age=31536000`
      }
      const mockUser = getMockUser() || {
        id: demoUserId,
        email: 'rafi_vai@gmail.com',
        user_metadata: { full_name: 'Rafi (Judge)', skills: [] },
        aud: 'authenticated',
        role: 'authenticated'
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
      const demoUserId = process.env.NEXT_PUBLIC_DEMO_USER_ID || 'Rafi_vai_shera'
      if (typeof window !== 'undefined') {
        localStorage.setItem('demo_user_id', demoUserId)
        document.cookie = `demo_user_id=${demoUserId}; path=/; max-age=31536000`
      }
      const mockUser = getMockUser() || {
        id: demoUserId,
        email: 'rafi_vai@gmail.com',
        user_metadata: { full_name: 'Rafi (Judge)', skills: [] },
        aud: 'authenticated',
        role: 'authenticated'
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
      const mockUser = getMockUser()
      if (mockUser) {
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

