import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { GoldButton } from '@/components/ui/gold-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GlassCard } from '@/components/ui/glass-card'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { toast } from 'sonner'
import { Lock, Mail, ArrowRight, Sparkles } from 'lucide-react'

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(error.message)
        setLoading(false)
        return
      }

      toast.success('Logged in successfully!')
      
      // Check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profile?.role === 'customer') {
        navigate('/customer/dashboard')
      } else {
        navigate('/admin/dashboard')
      }
    } catch (err: any) {
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative Gold Blurs */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-yellow-600/10 blur-3xl" />

      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <GlassCard className="w-full max-w-md p-8 relative z-10 border-amber-500/20 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 text-white shadow-xl mb-4 font-heading font-bold text-2xl">
            DG
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">DigiGold Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to manage your jewelry chit funds</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="admin@digigold.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>

          <GoldButton type="submit" className="w-full py-2.5 mt-2" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'} <ArrowRight className="h-4 w-4 ml-2" />
          </GoldButton>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground space-y-2">
          <p>
            Are you a customer?{' '}
            <Link to="/customer-login" className="text-amber-500 font-semibold hover:underline">
              Customer Portal Login
            </Link>
          </p>
          <p className="text-xs">
            Don't have an admin account?{' '}
            <Link to="/signup" className="text-foreground underline">
              Create Staff Account
            </Link>
          </p>
        </div>
      </GlassCard>
    </div>
  )
}
