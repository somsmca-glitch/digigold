import React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { GlassCard } from '@/components/ui/glass-card'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatINR, percentChange, formatDate } from '@/lib/utils'
import { DashboardKPIs } from '@/types/database'
import {
  Users,
  Layers,
  IndianRupee,
  AlertTriangle,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

async function fetchDashboardKPIs(): Promise<DashboardKPIs> {
  const todayDateObj = new Date()
  const today = todayDateObj.toISOString().split('T')[0]
  const monthStart = new Date(todayDateObj.getFullYear(), todayDateObj.getMonth(), 1)
    .toISOString()
    .split('T')[0]
  const next30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayDateObj)
    d.setDate(d.getDate() - (6 - i))
    return {
      dateStr: d.toISOString().split('T')[0],
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
    }
  })
  const startDate7d = last7Days[0].dateStr

  const [
    { count: activeCustomers },
    { count: activeChits },
    { data: todayPayments },
    { data: monthPayments },
    { data: weekPayments },
    { data: todayRate },
    { data: yesterdayRate },
    { count: maturities },
    { count: overdue },
  ] = await Promise.all([
    supabase.from('customers').select('*', { count: 'exact', head: true }),
    supabase.from('customer_chits').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('payments').select('amount').eq('payment_date', today),
    supabase.from('payments').select('amount').gte('payment_date', monthStart).lte('payment_date', today),
    supabase.from('payments').select('amount, payment_date').gte('payment_date', startDate7d).lte('payment_date', today),
    supabase.from('gold_rates').select('rate_22k').eq('date', today).maybeSingle(),
    supabase.from('gold_rates').select('rate_22k').eq('date', yesterday).maybeSingle(),
    supabase
      .from('customer_chits')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('maturity_date', today)
      .lte('maturity_date', next30),
    supabase.from('customer_chits').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ])

  const todays_collection = (todayPayments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0)
  const monthly_collection = (monthPayments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0)

  const weekly_collections = last7Days.map((d) => {
    const amount = (weekPayments ?? [])
      .filter((p) => p.payment_date === d.dateStr)
      .reduce((s, p) => s + (p.amount ?? 0), 0)
    return { day: d.day, amount }
  })

  return {
    total_active_customers: activeCustomers ?? 0,
    total_active_chits: activeChits ?? 0,
    todays_collection,
    monthly_collection,
    total_outstanding: 0,
    overdue_count: overdue ?? 0,
    maturities_next_30d: maturities ?? 0,
    gold_rate_22k_today: todayRate?.rate_22k ?? null,
    gold_rate_22k_yesterday: yesterdayRate?.rate_22k ?? null,
    weekly_collections,
  }
}

export const DashboardPage: React.FC = () => {
  const queryClient = useQueryClient()

  const { data: kpis, isLoading } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: fetchDashboardKPIs,
    refetchInterval: 30000,
  })

  // Realtime subscription setup
  React.useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gold_rates' },
        () => queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] })
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  const goldChange =
    kpis?.gold_rate_22k_today && kpis?.gold_rate_22k_yesterday
      ? percentChange(kpis.gold_rate_22k_yesterday, kpis.gold_rate_22k_today)
      : null

  const chartData = kpis?.weekly_collections ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Overview of your jewelry chit fund collections — {formatDate(new Date().toISOString())}
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Active Customers</span>
            <Users className="h-4 w-4 text-amber-500" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-2xl font-bold text-foreground">
              {kpis?.total_active_customers.toLocaleString('en-IN')}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Total enrolled members</p>
        </GlassCard>

        <GlassCard className="space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Active Chits</span>
            <Layers className="h-4 w-4 text-amber-500" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-2xl font-bold text-foreground">
              {kpis?.total_active_chits.toLocaleString('en-IN')}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Running scheme plans</p>
        </GlassCard>

        <GlassCard className="space-y-2 border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Collection</span>
            <IndianRupee className="h-4 w-4" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatINR(kpis?.todays_collection)}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Payments recorded today</p>
        </GlassCard>

        <GlassCard className="space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">This Month</span>
            <IndianRupee className="h-4 w-4 text-emerald-500" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-2xl font-bold text-foreground">
              {formatINR(kpis?.monthly_collection)}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Month-to-date collections</p>
        </GlassCard>

        <GlassCard className="space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Gold Rate (22K)</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-2xl font-bold text-amber-500">
              {kpis?.gold_rate_22k_today ? `${formatINR(kpis.gold_rate_22k_today)}/g` : 'Not set'}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {goldChange !== null
              ? `${goldChange >= 0 ? '+' : ''}${goldChange.toFixed(1)}% vs yesterday`
              : 'Today rate'}
          </p>
        </GlassCard>

        <GlassCard className="space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Maturities (30d)</span>
            <Calendar className="h-4 w-4 text-blue-500" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div className="text-2xl font-bold text-foreground">
              {kpis?.maturities_next_30d.toLocaleString('en-IN')}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Maturing next 30 days</p>
        </GlassCard>

        <GlassCard className="space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Overdue</span>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-16" />
          ) : (
            <div className="text-2xl font-bold text-destructive">
              {kpis?.overdue_count.toLocaleString('en-IN')}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Missed monthly dues</p>
        </GlassCard>

        <GlassCard className="space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">Outstanding</span>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-2xl font-bold text-foreground">
              {formatINR(kpis?.total_outstanding)}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Total due balance</p>
        </GlassCard>
      </div>

      {/* Analytics Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Weekly Collection Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="day" />
                <YAxis tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip formatter={(value: any) => [formatINR(value as number), 'Collection']} />
                <Bar dataKey="amount" fill="#DAA520" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="/admin/customers"
              className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm font-semibold">View Customers</p>
                  <p className="text-xs text-muted-foreground">Enroll & manage members</p>
                </div>
              </div>
            </a>
            <a
              href="/admin/gold-rate"
              className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm font-semibold">Update Gold Rates</p>
                  <p className="text-xs text-muted-foreground">Set 22K/24K/Silver rate</p>
                </div>
              </div>
            </a>
            <a
              href="/admin/reminders"
              className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm font-semibold">Send Reminders</p>
                  <p className="text-xs text-muted-foreground">WhatsApp & SMS notices</p>
                </div>
              </div>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
