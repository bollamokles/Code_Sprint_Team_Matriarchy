'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Compass, Loader2, Mail, Lock, AlertCircle, Sparkles, Target, TrendingUp, Users } from 'lucide-react'

// Demo accounts for testing
const DEMO_ACCOUNTS = [
  { name: 'Rafi (Judge)', email: 'rafi_vai@gmail.com', password: '123', role: 'Demo account' },
  { name: 'Sarah Chen', email: 'sarah.chen@demo.com', password: 'demo123', role: 'Software Engineer' },
  { name: 'Marcus Johnson', email: 'marcus.j@demo.com', password: 'demo123', role: 'Product Manager' },
  { name: 'Emily Rodriguez', email: 'emily.r@demo.com', password: 'demo123', role: 'UX Designer' },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showDemoAccounts, setShowDemoAccounts] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail)
    setPassword(demoPassword)
    setError(null)
    setIsLoading(true)

    const supabase = createClient()
    
    // First, try to login
    let { error } = await supabase.auth.signInWithPassword({
      email: demoEmail,
      password: demoPassword,
    })

    // If login failed, try to seed demo accounts and retry
    if (error) {
      try {
        await fetch('/api/seed-demo', { method: 'POST' })
        // Retry login after seeding
        const retryResult = await supabase.auth.signInWithPassword({
          email: demoEmail,
          password: demoPassword,
        })
        error = retryResult.error
      } catch {
        // Seeding failed, continue with original error
      }
    }

    if (error) {
      setError('Demo account login failed. Please try again or register a new account.')
      setIsLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar text-sidebar-foreground flex-col justify-between p-12 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-72 h-72 bg-sidebar-primary rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent rounded-full blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-sidebar-primary shadow-lg shadow-sidebar-primary/25">
            <Compass className="w-7 h-7 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">CareerPilot</h1>
            <p className="text-sm text-sidebar-foreground/60">Your AI Career Co-Pilot</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative space-y-8">
          <div>
            <h2 className="text-4xl font-bold leading-tight text-balance">
              Navigate your career journey with confidence
            </h2>
            <p className="mt-4 text-lg text-sidebar-foreground/70 leading-relaxed">
              AI-powered job hunting, smart application tracking, and personalized career guidance - all in one place.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-sidebar-accent/50">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-sidebar-primary/20">
                <Target className="w-5 h-5 text-sidebar-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Smart Job Matching</h3>
                <p className="text-sm text-sidebar-foreground/60">Find opportunities that align with your skills and goals</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl bg-sidebar-accent/50">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/20">
                <Sparkles className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold">AI-Powered Insights</h3>
                <p className="text-sm text-sidebar-foreground/60">Get personalized advice from your AI career assistant</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl bg-sidebar-accent/50">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-success/20">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <h3 className="font-semibold">Track Your Progress</h3>
                <p className="text-sm text-sidebar-foreground/60">Visual Kanban board and calendar to manage applications</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative">
          <p className="text-sm text-sidebar-foreground/40">
            Trusted by thousands of job seekers worldwide
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary shadow-lg shadow-primary/25">
              <Compass className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">CareerPilot</h1>
              <p className="text-sm text-muted-foreground">Your AI Career Co-Pilot</p>
            </div>
          </div>

          <Card className="border-border/50 shadow-xl shadow-border/10">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
              <CardDescription>
                Sign in to continue your career journey
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="bg-destructive/10 border-destructive/20">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 pt-2">
                <Button 
                  type="submit" 
                  className="w-full h-11 font-semibold shadow-lg shadow-primary/25"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>

                {/* Demo Accounts Section */}
                <div className="w-full">
                  <button
                    type="button"
                    onClick={() => setShowDemoAccounts(!showDemoAccounts)}
                    className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    <Users className="w-4 h-4" />
                    {showDemoAccounts ? 'Hide' : 'Show'} Demo Accounts
                  </button>
                  
                  {showDemoAccounts && (
                    <div className="mt-3 space-y-2 p-3 rounded-lg bg-muted/50 border border-border/50">
                      <p className="text-xs text-muted-foreground text-center mb-2">
                        Click to login with a demo account
                      </p>
                      {DEMO_ACCOUNTS.map((account) => (
                        <button
                          key={account.email}
                          type="button"
                          onClick={() => handleDemoLogin(account.email, account.password)}
                          disabled={isLoading}
                          className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-background transition-colors text-left disabled:opacity-50"
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                            {account.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{account.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{account.role}</p>
                          </div>
                        </button>
                      ))}
                      <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
                        Password for all: <code className="px-1 py-0.5 rounded bg-background text-primary">demo123</code>
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-sm text-center text-muted-foreground">
                  Don&apos;t have an account?{' '}
                  <Link href="/register" className="font-medium text-primary hover:underline">
                    Create one
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
