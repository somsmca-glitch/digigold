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
import { Phone, Lock, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'

export const CustomerLoginPage: React.FC = () => {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone) {
      toast.error('Please enter your mobile number')
      return
    }

    setLoading(true)
    try {
      // Clean phone format
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`

      // Sign in with phone + password or email fallback
      const { data, error } = await supabase.auth.signInWithPassword({
        phone: formattedPhone,
        password: password || '123456', // default fallback for customer phone login
      })

      if (error) {
        // Try email format mapping (phone@digigold.customer)
        const dummyEmail = `${phone.replace(/\D/g, '')}@digigold.customer`
        const { data: emailData, error: emailErr } = await supabase.auth.signInWithPassword({
          email: dummyEmail,
          password: password || '123456',
        })

        if (emailErr) {
          // If customer account doesn't exist yet, sign up customer anonymously
          const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
            email: dummyEmail,
            password: password || '123456',
            options: {
              data: {
                phone: phone,
                full_name: `Customer ${phone.slice(-4)}`,
              },
            },
          })

          if (signUpErr) {
            toast.error(signUpErr.message)
            setLoading(false)
            return
          }

          if (signUpData.user) {
            await supabase.from('customers').upsert({
              id: signUpData.user.id,
              name: `Customer ${phone.slice(-4)}`,
              phone: phone,
            })
          }
        }
      }

      toast.success('Welcome to DigiGold Customer Portal!')
      navigate('/customer/dashboard')
    } catch (err: any) {
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <GlassCard className="w-full max-w-md p-8 relative z-10 border-amber-500/20 shadow-2xl">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-white shadow-xl mb-4 font-heading font-bold text-2xl">
            DG
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Customer Passbook</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your jewelry savings, gold rates & payments</p>
        </div>

        <form onSubmit={handleCustomerLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Mobile Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="10-digit Mobile Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-9 text-lg tracking-wide"
                maxLength={10}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password (Optional)</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Default: 123456"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <GoldButton type="submit" className="w-full py-3 text-base mt-4" disabled={loading}>
            {loading ? 'Logging in...' : 'View My Passbook'} <ArrowRight className="h-5 w-5 ml-2" />
          </GoldButton>
        </form>

        <div className="mt-8 border-t border-border/60 pt-4 text-center text-xs text-muted-foreground">
          <p className="flex items-center justify-center gap-1">
            <ShieldCheck className="h-4 w-4 text-amber-500" /> Safe & Secure Gold Chit Savings
          </p>
          <div className="mt-4">
            <Link to="/login" className="text-muted-foreground hover:text-foreground underline">
              Admin Login Portal
            </Link>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
