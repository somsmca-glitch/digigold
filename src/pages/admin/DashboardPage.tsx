import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { GlassCard } from '@/components/ui/glass-card'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatINR, percentChange, formatDate, formatDateTime, getInitials } from '@/lib/utils'
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
  Activity,
  ArrowRight,
  Clock,
  CheckCircle2,
  ChevronRight,
  Coins,
  Filter
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

  const [
    { count: activeCustomers },
    { count: activeChits },
    { data: todayPayments },
    { data: monthPayments },
    { data: todayRate },
    { data: yesterdayRate },
    { count: maturities },
    { data: activeChitsData },
  ] = await Promise.all([
    supabase.from('customers').select('*', { count: 'exact', head: true }),
    supabase.from('customer_chits').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('payments').select('amount').eq('payment_date', today),
    supabase.from('payments').select('amount').gte('payment_date', monthStart).lte('payment_date', today),
    supabase.from('gold_rates').select('rate_22k').eq('date', today).maybeSingle(),
    supabase.from('gold_rates').select('rate_22k').eq('date', yesterday).maybeSingle(),
    supabase
      .from('customer_chits')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('maturity_date', today)
      .lte('maturity_date', next30),
    supabase
      .from('customer_chits')
      .select('id, start_date, agreed_amount, monthly_due_day, payments(amount)')
      .eq('status', 'active'),
  ])

  const todays_collection = (todayPayments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0)
  const monthly_collection = (monthPayments ?? []).reduce((s, p) => s + (p.amount ?? 0), 0)

  let overdue_count = 0
  let total_outstanding = 0

  const now = new Date()
  ;(activeChitsData ?? []).forEach((chit: any) => {
    if (!chit.start_date || !chit.agreed_amount) return
    const startDate = new Date(chit.start_date)
    let monthsElapsed = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth())
    if (now.getDate() < chit.monthly_due_day) monthsElapsed--
    monthsElapsed = Math.max(0, monthsElapsed)

    const expectedTotal = monthsElapsed * chit.agreed_amount
    const actualTotal = (chit.payments ?? []).reduce((s: number, p: any) => s + (p.amount ?? 0), 0)

    if (actualTotal < expectedTotal) {
      overdue_count++
      total_outstanding += (expectedTotal - actualTotal)
    }
  })

  return {
    total_active_customers: activeCustomers ?? 0,
    total_active_chits: activeChits ?? 0,
    todays_collection,
    monthly_collection,
    total_outstanding,
    overdue_count,
    maturities_next_30d: maturities ?? 0,
    gold_rate_22k_today: todayRate?.rate_22k ?? null,
    gold_rate_22k_yesterday: yesterdayRate?.rate_22k ?? null,
  }
}

// ── Dynamic Collection Trend Query ────────────────────────────────
async function fetchCollectionTrend(rangeMode: 'current_week' | 'last_week' | 'last_month') {
  const today = new Date()

  if (rangeMode === 'current_week') {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - (6 - i))
      return {
        dateStr: d.toISOString().split('T')[0],
        dayLabel: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        shortDate: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      }
    })
    const startDate = days[0].dateStr
    const endDate = days[6].dateStr

    const { data } = await supabase
      .from('payments')
      .select('amount, payment_date')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate)

    return days.map(d => ({
      day: `${d.dayLabel} (${d.shortDate})`,
      amount: (data ?? []).filter(p => p.payment_date === d.dateStr).reduce((s, p) => s + (p.amount ?? 0), 0)
    }))
  }

  if (rangeMode === 'last_week') {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - (13 - i))
      return {
        dateStr: d.toISOString().split('T')[0],
        dayLabel: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        shortDate: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      }
    })
    const startDate = days[0].dateStr
    const endDate = days[6].dateStr

    const { data } = await supabase
      .from('payments')
      .select('amount, payment_date')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate)

    return days.map(d => ({
      day: `${d.dayLabel} (${d.shortDate})`,
      amount: (data ?? []).filter(p => p.payment_date === d.dateStr).reduce((s, p) => s + (p.amount ?? 0), 0)
    }))
  }

  // last_month (30 days)
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (29 - i))
    return {
      dateStr: d.toISOString().split('T')[0],
      dayLabel: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    }
  })
  const startDate = days[0].dateStr
  const endDate = days[29].dateStr

  const { data } = await supabase
    .from('payments')
    .select('amount, payment_date')
    .gte('payment_date', startDate)
    .lte('payment_date', endDate)

  return days.map(d => ({
    day: d.dayLabel,
    amount: (data ?? []).filter(p => p.payment_date === d.dateStr).reduce((s, p) => s + (p.amount ?? 0), 0)
  }))
}

export const DashboardPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [chartRange, setChartRange] = useState<'current_week' | 'last_week' | 'last_month'>('current_week')

  // Real-time Supabase subscription for instant live updates
  React.useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard-chart-trend'] })
        queryClient.invalidateQueries({ queryKey: ['recent-activities'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gold_rates' }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  const { data: kpis, isLoading: loadingKpis } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: fetchDashboardKPIs,
    refetchInterval: 30000,
  })

  // Fetch Filtered Chart Trend Data
  const { data: chartData = [], isLoading: loadingChart } = useQuery({
    queryKey: ['dashboard-chart-trend', chartRange],
    queryFn: () => fetchCollectionTrend(chartRange),
  })

  // Fetch Live Recent Activities
  const { data: recentActivities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: async () => {
      const [paymentsRes, chitsRes] = await Promise.all([
        supabase
          .from('payments')
          .select(`
            id, amount, payment_date, payment_mode, created_at, customer_id, notes,
            customer:customers(id, name, photo_url, phone),
            customer_chit:customer_chits(scheme:chit_schemes(name)),
            recorder:profiles!recorded_by(full_name, role)
          `)
          .order('created_at', { ascending: false })
          .limit(6),
        supabase
          .from('customer_chits')
          .select(`
            id, created_at, customer_id,
            customer:customers(id, name, photo_url, phone),
            scheme:chit_schemes(name),
            enroller:profiles!enrolled_by(full_name, role)
          `)
          .order('created_at', { ascending: false })
          .limit(6)
      ])

      if (paymentsRes.error) throw paymentsRes.error

      let chitsData: any[] = []
      if (chitsRes.error) {
        // Fallback query if enrolled_by column does not exist yet in Supabase
        const fallbackRes = await supabase
          .from('customer_chits')
          .select(`
            id, created_at, customer_id,
            customer:customers(id, name, photo_url, phone),
            scheme:chit_schemes(name)
          `)
          .order('created_at', { ascending: false })
          .limit(6)
        chitsData = fallbackRes.data || []
      } else {
        chitsData = chitsRes.data || []
      }

      const paymentsData = (paymentsRes.data || []) as any[]

      const normalizedPayments = paymentsData.map(p => {
        const custName = p.customer?.name || 'Customer'
        const actorName = p.recorder?.full_name && p.recorder?.role !== 'customer'
          ? `${p.recorder.full_name} (${p.recorder.role === 'admin' ? 'Admin' : 'Staff'})`
          : custName

        return {
          id: `payment-${p.id}`,
          type: 'payment',
          created_at: p.created_at,
          customer_id: p.customer_id,
          customerName: custName,
          schemeName: p.customer_chit?.scheme?.name || 'Chit Plan',
          staffName: actorName,
          amount: p.amount,
          payment_mode: p.payment_mode,
          payment_date: p.payment_date,
          customerAvatarUrl: p.customer?.photo_url,
        }
      })

      const normalizedEnrolments = chitsData.map(c => {
        const custName = c.customer?.name || 'Customer'
        const actorName = c.enroller?.full_name && c.enroller?.role !== 'customer'
          ? `${c.enroller.full_name} (${c.enroller.role === 'admin' ? 'Admin' : 'Staff'})`
          : custName

        return {
          id: `enrolment-${c.id}`,
          type: 'enrolment',
          created_at: c.created_at,
          customer_id: c.customer_id,
          customerName: custName,
          schemeName: c.scheme?.name || 'Chit Plan',
          staffName: actorName,
          amount: undefined,
          payment_mode: undefined,
          payment_date: undefined,
          customerAvatarUrl: c.customer?.photo_url,
        }
      })

      const combined = [...normalizedPayments, ...normalizedEnrolments]
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      return combined.slice(0, 6) as any[]
    },
    refetchInterval: 15000,
  })

  // Realtime subscription setup
  React.useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard-chart-trend'] })
          queryClient.invalidateQueries({ queryKey: ['recent-activities'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customer_chits' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] })
          queryClient.invalidateQueries({ queryKey: ['recent-activities'] })
        }
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

  const chartTotalAmount = chartData.reduce((s, d) => s + (d.amount || 0), 0)

  // KPI card items configuration for uniform animated rendering
  const kpiItems = [
    {
      title: 'Active Customers',
      icon: Users,
      iconColor: 'text-amber-500',
      value: kpis?.total_active_customers.toLocaleString('en-IN'),
      subtext: 'Enrolled members',
      isVal: false,
    },
    {
      title: 'Active Chits',
      icon: Layers,
      iconColor: 'text-amber-500',
      value: kpis?.total_active_chits.toLocaleString('en-IN'),
      subtext: 'Running scheme plans',
      isVal: false,
    },
    {
      title: "Today's Collection",
      icon: IndianRupee,
      iconColor: 'text-amber-500',
      value: formatINR(kpis?.todays_collection),
      subtext: 'Payments today',
      isVal: true,
    },
    {
      title: 'This Month',
      icon: IndianRupee,
      iconColor: 'text-emerald-500',
      value: formatINR(kpis?.monthly_collection),
      subtext: 'Month-to-date',
      isVal: true,
    },
    {
      title: 'Gold Rate (22K)',
      icon: Sparkles,
      iconColor: 'text-amber-500',
      value: kpis?.gold_rate_22k_today ? `${formatINR(kpis.gold_rate_22k_today)}/g` : 'Not set',
      subtext: goldChange !== null ? (
        <span className={`font-bold inline-flex items-center gap-0.5 ${
          goldChange > 0 ? 'text-emerald-600 dark:text-emerald-400' : goldChange < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
        }`}>
          {goldChange > 0 ? <TrendingUp className="h-3 w-3 inline" /> : goldChange < 0 ? <TrendingDown className="h-3 w-3 inline" /> : null}
          {goldChange >= 0 ? '+' : ''}{goldChange.toFixed(1)}% vs yesterday
        </span>
      ) : 'Today rate',
      isVal: false,
    },
    {
      title: 'Maturities (30d)',
      icon: Calendar,
      iconColor: 'text-blue-500',
      value: kpis?.maturities_next_30d.toLocaleString('en-IN'),
      subtext: 'Maturing next 30 days',
      isVal: false,
    },
    {
      title: 'Overdue',
      icon: AlertTriangle,
      iconColor: 'text-destructive',
      value: kpis?.overdue_count.toLocaleString('en-IN'),
      subtext: 'Missed monthly dues',
      isVal: false,
      textColor: 'text-destructive',
    },
    {
      title: 'Outstanding',
      icon: IndianRupee,
      iconColor: 'text-muted-foreground',
      value: formatINR(kpis?.total_outstanding),
      subtext: 'Total due balance',
      isVal: true,
    },
  ]

  return (
    <div className="flex flex-col gap-4 h-full max-h-screen overflow-hidden pb-4">
      {/* Sleek Single-Row Header */}
      <div className="flex items-center justify-between shrink-0">
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
          Dashboard
        </h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 gap-1.5 border-amber-500/30 bg-amber-500/5">
            <Calendar className="h-3.5 w-3.5 text-amber-500" />
            {formatDate(new Date().toISOString())}
          </Badge>
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold px-2 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 rate-live-dot inline-block mr-1.5" />
            Live Sync
          </Badge>
        </div>
      </div>

      {/* Uniform Animated KPI Grid (Don't Highlight, Pure Cohesive Glass Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        {kpiItems.map((item, idx) => {
          const Icon = item.icon
          return (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: idx * 0.04, duration: 0.3 }}
              whileHover={{ y: -3, scale: 1.02, transition: { duration: 0.15 } }}
            >
              <GlassCard className="p-3 space-y-1 border-border/70 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[10px] font-bold uppercase tracking-wider">{item.title}</span>
                  <Icon className={`h-3.5 w-3.5 ${item.iconColor}`} />
                </div>
                {loadingKpis ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  <div className={`text-xl font-extrabold ${item.textColor || 'text-foreground'}`}>
                    {item.value}
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground">
                  {item.subtext}
                </div>
              </GlassCard>
            </motion.div>
          )
        })}
      </div>

      {/* Analytics Chart & Recent Activity Row (Fills viewport height) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        {/* Collection Trend Chart with Range Selector */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="lg:col-span-2 flex flex-col min-h-0"
        >
          <Card className="h-full shadow-md flex flex-col justify-between overflow-hidden border-border/70 hover:border-amber-500/30 transition-all">
            <CardHeader className="py-2.5 px-4 border-b border-border/50 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-amber-500" />
                    Collection Trend
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground">
                    Period Total: <span className="font-bold text-amber-600 dark:text-amber-400">{formatINR(chartTotalAmount)}</span>
                  </p>
                </div>

                {/* FILTER BUTTONS: Current Week | Last Week | Last Month */}
                <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-muted/40 self-start sm:self-auto">
                  <button
                    onClick={() => setChartRange('current_week')}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all ${
                      chartRange === 'current_week'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Current Week
                  </button>
                  <button
                    onClick={() => setChartRange('last_week')}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all ${
                      chartRange === 'last_week'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Last Week
                  </button>
                  <button
                    onClick={() => setChartRange('last_month')}
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-all ${
                      chartRange === 'last_month'
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Last Month
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 flex-1 min-h-0">
              {loadingChart ? (
                <div className="h-full flex items-center justify-center">
                  <Skeleton className="h-full w-full rounded-xl" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: chartRange === 'last_month' ? 9 : 10 }}
                      interval={chartRange === 'last_month' ? 2 : 0}
                    />
                    <YAxis tickFormatter={(v) => `₹${v / 1000}k`} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value: any) => [formatINR(value as number), 'Collection']} />
                    <Bar dataKey="amount" fill="#DAA520" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Live Recent Activity Feed — Matched Single Page Height */}
        <motion.div
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col min-h-0"
        >
          <Card className="h-full shadow-md border-amber-500/20 flex flex-col justify-between overflow-hidden hover:border-amber-500/40 transition-all">
            <div className="flex flex-col flex-1 overflow-hidden">
              <CardHeader className="py-2.5 px-4 border-b border-border/60 shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-amber-500" />
                    Recent Activity
                  </CardTitle>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 rate-live-dot inline-block" />
                    <span>Live Feed</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-y-auto flex-1">
                {loadingActivities ? (
                  <div className="p-3 space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-1 flex-1">
                          <Skeleton className="h-3 w-3/4" />
                          <Skeleton className="h-2 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentActivities.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No recent activities recorded yet.
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {recentActivities.map((act, idx) => {
                      const isPayment = act.type === 'payment'

                      return (
                        <motion.div
                          key={act.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className="p-2.5 hover:bg-muted/40 transition-colors flex items-start gap-2.5 group text-xs"
                        >
                          <Avatar className="h-7 w-7 mt-0.5 border border-amber-500/30">
                            <AvatarImage src={act.customerAvatarUrl ?? undefined} />
                            <AvatarFallback className="bg-amber-500/10 text-amber-600 font-bold text-[10px]">
                              {getInitials(act.customerName)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <Link
                                to={`/admin/customers/${act.customer_id || ''}`}
                                className="font-bold text-foreground hover:text-amber-500 transition-colors truncate text-xs"
                              >
                                {act.customerName}
                              </Link>
                              {isPayment ? (
                                <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">
                                  +{formatINR(act.amount)}
                                </span>
                              ) : (
                                <span className="text-[9px] uppercase font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded shrink-0">
                                  Enrolment
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {isPayment ? 'Paid for ' : 'Enrolled in '} <span className="font-medium text-foreground">{act.schemeName}</span>
                            </p>
                            <div className="flex items-center justify-between text-[9px] text-muted-foreground mt-0.5">
                              {isPayment ? (
                                <span className="uppercase font-semibold px-1.5 py-0.2 rounded bg-muted">
                                  {act.payment_mode}
                                </span>
                              ) : <span />}
                              <span className="font-bold text-amber-600 dark:text-amber-400">
                                By: {act.staffName}
                              </span>
                              <span>{formatDate(act.payment_date || act.created_at)}</span>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </div>

            <div className="py-2 px-3 border-t border-border/60 bg-muted/20 text-center shrink-0">
              <Link
                to="/admin/reports#activity-feed"
                className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
              >
                View Full Transaction Reports <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
