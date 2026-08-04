import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { CustomerChit, GoldRate, Scheme } from '@/types/database'
import { GlassCard } from '@/components/ui/glass-card'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GoldButton } from '@/components/ui/gold-button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatINR, formatDate } from '@/lib/utils'
import { Sparkles, Layers, BookOpen, Coins, ArrowRight } from 'lucide-react'

export const CustomerDashboard: React.FC = () => {
  const { user, profile } = useAuth()

  // Fetch latest gold rate from Supabase
  const { data: todayRate } = useQuery({
    queryKey: ['today-rate'],
    queryFn: async () => {
      const { data } = await supabase.from('gold_rates').select('*').order('date', { ascending: false }).limit(1).maybeSingle()
      return data as GoldRate | null
    },
  })

  // Fetch Customer Chits
  const { data: chits = [], isLoading: loadingChits } = useQuery({
    queryKey: ['my-chits', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_chits')
        .select('*, scheme:chit_schemes(*)')
        .eq('customer_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as (CustomerChit & { scheme?: Scheme })[]
    },
    enabled: !!user?.id,
  })

  const activeChits = chits.filter((c: CustomerChit) => c.status === 'active')
  const totalAgreed = activeChits.reduce((acc: number, c: CustomerChit) => acc + (c.agreed_amount || 0), 0)

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <GlassCard className="relative overflow-hidden border-amber-500/30 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-amber-500 font-semibold text-xs uppercase tracking-wider mb-1">
              <Sparkles className="h-4 w-4" /> Welcome back
            </div>
            <h1 className="font-heading text-2xl font-bold text-foreground">
              {profile?.full_name ?? user?.user_metadata?.full_name ?? 'Valued Customer'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Track your active gold savings and upcoming dues</p>
          </div>

          <Link to="/customer/schemes">
            <GoldButton>
              Explore Plans <ArrowRight className="h-4 w-4 ml-1" />
            </GoldButton>
          </Link>
        </div>
      </GlassCard>

      {/* Gold Rate Ticker */}
      <Card className="p-4 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border-amber-500/20">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 font-semibold">
            <Coins className="h-5 w-5 text-amber-500" />
            <span>Today's 22K Gold Rate:</span>
          </div>
          <span className="font-bold text-base text-amber-600 dark:text-amber-400">
            {todayRate?.rate_22k ? `${formatINR(todayRate.rate_22k)}/g` : 'Not Published'}
          </span>
        </div>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-4">
        <GlassCard className="p-4 space-y-1">
          <span className="text-xs text-muted-foreground uppercase font-medium">Active Plans</span>
          <div className="text-2xl font-bold text-foreground">{activeChits.length}</div>
          <p className="text-xs text-muted-foreground">Running chit schemes</p>
        </GlassCard>

        <GlassCard className="p-4 space-y-1">
          <span className="text-xs text-muted-foreground uppercase font-medium">Monthly Savings</span>
          <div className="text-2xl font-bold text-amber-500">{formatINR(totalAgreed)}</div>
          <p className="text-xs text-muted-foreground font-medium">Total monthly commitment</p>
        </GlassCard>
      </div>

      {/* My Enrolled Chits */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-lg font-bold">My Active Schemes ({activeChits.length})</h2>
          <Link to="/customer/passbook" className="text-xs text-amber-500 font-semibold hover:underline flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" /> View Passbook
          </Link>
        </div>

        {loadingChits ? (
          <Skeleton className="h-32 w-full" />
        ) : activeChits.length === 0 ? (
          <Card className="p-8 text-center space-y-3">
            <Layers className="h-10 w-10 mx-auto text-amber-500/50" />
            <h3 className="font-semibold text-base">No active chit plans</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Start saving for your favorite gold jewelry today with zero making charges bonus!
            </p>
            <Link to="/customer/schemes">
              <GoldButton className="mt-2">
                Browse Schemes
              </GoldButton>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {activeChits.map((chit: CustomerChit & { scheme?: Scheme }) => (
              <Card key={chit.id} className="p-5 border-amber-500/20 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-heading font-bold text-base text-foreground">
                      {chit.scheme?.name ?? 'Gold Savings Scheme'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Monthly Due Day: Day {chit.monthly_due_day}
                    </p>
                  </div>
                  <Badge variant="gold" className="capitalize">
                    {chit.status}
                  </Badge>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">Monthly Installment</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {formatINR(chit.agreed_amount)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground block">Maturity Date</span>
                    <span className="font-semibold text-foreground">{formatDate(chit.maturity_date)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
