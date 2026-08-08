import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GoldButton } from '@/components/ui/gold-button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatINR, formatDate } from '@/lib/utils'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  FileText, Download, TrendingUp, TrendingDown, Users, Layers,
  AlertTriangle, Calendar, Coins, IndianRupee, CheckCircle2,
  Clock, RefreshCw, BarChart2, PieChart as PieIcon, Activity, ChevronRight,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────
interface PaymentRow {
  amount: number
  payment_date: string
  payment_mode: string
  customer_id: string
}

interface ChitRow {
  id: string
  status: string
  maturity_date: string
  start_date: string
  agreed_amount: number | null
  scheme_id: string
  scheme?: { name: string; duration_months: number }
  customer?: { name: string; phone: string }
}

interface CustomerRow {
  id: string
  name: string
  phone: string
  city: string | null
  created_at: string
}

interface GoldRateRow {
  date: string
  rate_22k: number
  rate_24k: number
  silver_rate: number
}

// ── CSV Export helper ──────────────────────────────────────────
function exportCSV(filename: string, rows: Record<string, string | number>[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(',')),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Colors ─────────────────────────────────────────────────────
const GOLD_COLORS = ['#DAA520', '#F0C040', '#B8860B', '#E8C96E', '#92660A', '#FDE68A']
const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  redeemed: '#3b82f6',
  closed: '#6b7280',
  defaulted: '#ef4444',
}

// ── Section Header Component ───────────────────────────────────
const SectionHeader: React.FC<{
  icon: React.ReactNode
  title: string
  subtitle: string
  badge?: string
}> = ({ icon, title, subtitle, badge }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="h-10 w-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <h2 className="font-heading text-lg font-bold text-foreground">{title}</h2>
        {badge && <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold">{badge}</Badge>}
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  </div>
)

// ── KPI Mini Card ──────────────────────────────────────────────
const KPICard: React.FC<{
  label: string; value: string; sub?: string; accent?: boolean; danger?: boolean
}> = ({ label, value, sub, accent, danger }) => (
  <div className={`rounded-xl border p-4 space-y-1 ${accent
    ? 'border-amber-500/30 bg-amber-500/8'
    : danger
    ? 'border-red-500/30 bg-red-500/8'
    : 'border-border bg-card'}`}>
    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={`text-xl font-extrabold ${accent ? 'text-amber-600 dark:text-amber-400' : danger ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
      {value}
    </p>
    {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
  </div>
)

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export const ReportsPage: React.FC = () => {
  const today = new Date()
  const [monthFilter, setMonthFilter] = useState<string>(
    today.toISOString().slice(0, 7) // 'YYYY-MM'
  )

  const monthStart = `${monthFilter}-01`
  const monthEnd = new Date(parseInt(monthFilter.split('-')[0]), parseInt(monthFilter.split('-')[1]), 0)
    .toISOString().split('T')[0]
  const next30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const next60 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const todayStr = today.toISOString().split('T')[0]

  // ── All payments for selected month ─────────────────────────
  const { data: monthPayments = [], isLoading: loadingPayments, refetch: refetchPayments } = useQuery({
    queryKey: ['report-monthly-payments', monthFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('amount, payment_date, payment_mode, customer_id, customer:customers(name, phone)')
        .gte('payment_date', monthStart)
        .lte('payment_date', monthEnd)
        .order('payment_date', { ascending: false })
      if (error) throw error
      return (data ?? []) as any[]
    },
  })

  // ── All chit schemes for lookup ────────────────────────────
  const { data: chitSchemes = [] } = useQuery({
    queryKey: ['report-schemes-lookup'],
    queryFn: async () => {
      const { data } = await supabase.from('chit_schemes').select('*')
      return data ?? []
    },
  })

  // ── All customers ────────────────────────────────────────────
  const { data: customers = [] } = useQuery({
    queryKey: ['report-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, city, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as CustomerRow[]
    },
  })

  // ── All chits with scheme + customer (Resilient) ──────────────
  const { data: rawChits = [], isLoading: loadingChits, refetch: refetchChits } = useQuery({
    queryKey: ['report-all-chits-resilient'],
    queryFn: async () => {
      let { data, error } = await supabase
        .from('customer_chits')
        .select('*, scheme:chit_schemes(*)')
        .order('created_at', { ascending: false })

      if (error) {
        const fallback = await supabase
          .from('customer_chits')
          .select('*')
          .order('created_at', { ascending: false })
        data = fallback.data
      }
      return (data ?? []) as any[]
    },
  })

  const allChits: ChitRow[] = React.useMemo(() => {
    const custMap = new Map(customers.map((c) => [c.id, c]))
    const schemeMap = new Map(chitSchemes.map((s) => [s.id, s]))

    return rawChits.map((c: any) => {
      const cust = c.customer || custMap.get(c.customer_id)
      const sch = c.scheme || schemeMap.get(c.scheme_id)
      return {
        ...c,
        scheme: sch ? { name: sch.name, duration_months: sch.duration_months || 11 } : undefined,
        customer: cust ? { name: cust.name, phone: cust.phone } : undefined,
      } as ChitRow
    })
  }, [rawChits, customers, chitSchemes])

  // ── Last 6 months payment trend ──────────────────────────────
  const { data: trendData = [] } = useQuery({
    queryKey: ['report-6month-trend'],
    queryFn: async () => {
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1)
        return {
          label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
          start: d.toISOString().split('T')[0],
          end: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0],
        }
      })
      const results = await Promise.all(
        months.map(async (m) => {
          const { data } = await supabase
            .from('payments')
            .select('amount')
            .gte('payment_date', m.start)
            .lte('payment_date', m.end)
          const total = (data ?? []).reduce((s, p) => s + (p.amount ?? 0), 0)
          return { month: m.label, amount: total }
        })
      )
      return results
    },
  })

  // ── Gold rate history last 30 days ───────────────────────────
  const { data: goldHistory = [] } = useQuery({
    queryKey: ['report-gold-history'],
    queryFn: async () => {
      const past30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('gold_rates')
        .select('date, rate_22k, rate_24k, silver_rate')
        .gte('date', past30)
        .order('date', { ascending: true })
      if (error) throw error
      return (data ?? []) as GoldRateRow[]
    },
  })

  // ── Maturities in next 30 & 60 days ─────────────────────────
  const { data: upcomingMaturities = [] } = useQuery({
    queryKey: ['report-maturities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_chits')
        .select('*, scheme:chit_schemes(name), customer:customers(name, phone)')
        .eq('status', 'active')
        .gte('maturity_date', todayStr)
        .lte('maturity_date', next60)
        .order('maturity_date', { ascending: true })
      if (error) throw error
      return (data ?? []) as ChitRow[]
    },
  })

  // ── Defaulted / problematic chits ───────────────────────────
  const { data: defaultedChits = [] } = useQuery({
    queryKey: ['report-defaulted'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_chits')
        .select('*, scheme:chit_schemes(name), customer:customers(name, phone)')
        .in('status', ['defaulted', 'closed'])
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as ChitRow[]
    },
  })

  // ── Derived calculations ─────────────────────────────────────
  const totalMonthCollection = monthPayments.reduce((s: number, p: any) => s + (p.amount ?? 0), 0)
  const activeChits = allChits.filter(c => c.status === 'active')
  const totalActiveInstallments = activeChits.reduce((s, c) => s + (c.agreed_amount ?? 0), 0)

  const modeBreakdown = monthPayments.reduce((acc: Record<string, number>, p: any) => {
    acc[p.payment_mode] = (acc[p.payment_mode] ?? 0) + p.amount
    return acc
  }, {})
  const modePieData = Object.entries(modeBreakdown).map(([name, value]) => ({ name: name.replace('_', ' '), value }))

  const statusBreakdown = allChits.reduce((acc: Record<string, number>, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1
    return acc
  }, {})
  const statusPieData = Object.entries(statusBreakdown).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1), value
  }))

  const cityBreakdown = customers.reduce((acc: Record<string, number>, c) => {
    const city = c.city || 'Unknown'
    acc[city] = (acc[city] ?? 0) + 1
    return acc
  }, {})
  const topCities = Object.entries(cityBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([city, count]) => ({ city, count }))

  const maturitiesNext30 = upcomingMaturities.filter(c => c.maturity_date <= next30)
  const maturitiesNext60 = upcomingMaturities.filter(c => c.maturity_date > next30)

  // ── Export handlers ──────────────────────────────────────────
  const handleExportMonthly = () => {
    exportCSV(`monthly_collection_${monthFilter}.csv`, monthPayments.map((p: any) => ({
      Customer: p.customer?.name ?? 'Unknown',
      Phone: p.customer?.phone ?? '',
      Amount: p.amount,
      Date: p.payment_date,
      Mode: p.payment_mode,
    })))
  }

  const handleExportMaturities = () => {
    exportCSV(`maturities_next60days.csv`, upcomingMaturities.map(c => ({
      Customer: c.customer?.name ?? '',
      Phone: c.customer?.phone ?? '',
      Scheme: c.scheme?.name ?? '',
      Maturity_Date: c.maturity_date,
      Monthly_Amount: c.agreed_amount ?? 0,
    })))
  }

  const handleExportDefaulted = () => {
    exportCSV(`defaulted_chits.csv`, defaultedChits.map(c => ({
      Customer: c.customer?.name ?? '',
      Phone: c.customer?.phone ?? '',
      Scheme: c.scheme?.name ?? '',
      Status: c.status,
      Start_Date: c.start_date,
      Maturity_Date: c.maturity_date,
    })))
  }

  return (
    <div className="space-y-10">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Business Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Live analytics from your Supabase data — collections, schemes, rates & more
          </p>
        </div>
        <Badge className="self-start sm:self-auto bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold px-3 py-1.5">
          <Activity className="inline h-3 w-3 mr-1" /> Live Data
        </Badge>
      </div>

      {/* ══════════════════════════════════════════════════════
          REPORT 1 — Monthly Collection Summary
      ══════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          icon={<IndianRupee className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
          title="Monthly Collection Report"
          subtitle="Installment payments collected — filter by month"
        />

        {/* Month picker + actions */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Input
            type="month"
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            className="w-40 text-sm"
          />
          <Button variant="outline" size="sm" onClick={() => refetchPayments()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportMonthly} disabled={!monthPayments.length}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
          </Button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <KPICard
            label="Total Collected"
            value={formatINR(totalMonthCollection)}
            sub={`${monthPayments.length} transactions`}
            accent
          />
          <KPICard
            label="Cash"
            value={formatINR(modeBreakdown['cash'] ?? 0)}
            sub="Cash payments"
          />
          <KPICard
            label="UPI / Digital"
            value={formatINR((modeBreakdown['upi'] ?? 0) + (modeBreakdown['bank_transfer'] ?? 0))}
            sub="UPI + Bank"
          />
          <KPICard
            label="Cheque"
            value={formatINR(modeBreakdown['cheque'] ?? 0)}
            sub="Cheque payments"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payment mode pie chart */}
          <Card className="p-5">
            <p className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-amber-500" /> Payment Mode Split
            </p>
            {modePieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={modePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {modePieData.map((_, i) => (
                      <Cell key={i} fill={GOLD_COLORS[i % GOLD_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatINR(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No payments this month</p>
            )}
          </Card>

          {/* Transaction table */}
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">Recent Payments</p>
              <Badge variant="outline" className="text-xs">{monthPayments.length} entries</Badge>
            </div>
            <div className="overflow-auto max-h-[220px]">
              {loadingPayments ? (
                <div className="p-4 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : monthPayments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No payments this month</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-2.5 font-semibold text-muted-foreground">Customer</th>
                      <th className="text-right p-2.5 font-semibold text-muted-foreground">Amount</th>
                      <th className="text-right p-2.5 font-semibold text-muted-foreground">Date</th>
                      <th className="text-center p-2.5 font-semibold text-muted-foreground">Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {monthPayments.slice(0, 30).map((p: any, i: number) => (
                      <tr key={i} className="hover:bg-muted/30 transition-colors">
                        <td className="p-2.5 font-medium text-foreground">{p.customer?.name ?? '—'}</td>
                        <td className="p-2.5 text-right font-bold text-amber-600 dark:text-amber-400">{formatINR(p.amount)}</td>
                        <td className="p-2.5 text-right text-muted-foreground">{formatDate(p.payment_date)}</td>
                        <td className="p-2.5 text-center">
                          <span className="bg-muted rounded px-1.5 py-0.5 capitalize text-foreground">{p.payment_mode?.replace('_', ' ')}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      </section>

      <div className="border-t border-border/60" />

      {/* ══════════════════════════════════════════════════════
          REPORT 2 — 6-Month Collection Trend
      ══════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          icon={<TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
          title="6-Month Collection Trend"
          subtitle="Month-over-month payment collections across all customers"
        />
        <Card className="p-5">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: any) => [formatINR(v), 'Collection']}
                contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
              />
              <Bar dataKey="amount" fill="#DAA520" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </section>

      <div className="border-t border-border/60" />

      {/* ══════════════════════════════════════════════════════
          REPORT 3 — Scheme / Chit Status Breakdown
      ══════════════════════════════════════════════════════ */}
      {/* ══════════════════════════════════════════════════════
          REPORT 3 — Scheme / Chit Status Breakdown
      ══════════════════════════════════════════════════════ */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <SectionHeader
            icon={<Layers className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
            title="Chit Scheme Status Overview"
            subtitle="Active, redeemed, closed and defaulted chit breakdown"
            badge={`${allChits.length} total enrolled`}
          />
          <Link
            to="/admin/reports/scheme-status"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-500 transition-colors bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/25 shrink-0"
          >
            Full Analytics View <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(statusBreakdown).map(([status, count]) => (
            <div
              key={status}
              className="rounded-2xl border p-4 transition-all hover:scale-[1.02]"
              style={{ borderColor: `${STATUS_COLORS[status]}35`, background: `${STATUS_COLORS[status]}08` }}
            >
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground capitalize">{status}</p>
              <p className="text-3xl font-black mt-1" style={{ color: STATUS_COLORS[status] }}>{count}</p>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">enrolled chit plans</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status pie */}
          <Card className="p-5 border-amber-500/20 shadow-md">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-2">
              <p className="text-sm font-bold text-foreground">Status Distribution</p>
              <Badge variant="outline" className="text-[10px] font-bold border-amber-500/30 text-amber-600 dark:text-amber-400">
                Live Portfolio Split
              </Badge>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={4}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusPieData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.name.toLowerCase()] ?? GOLD_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Active scheme expected monthly */}
          <Card className="p-5 border-amber-500/20 shadow-md">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-2">
              <p className="text-sm font-bold text-foreground">Active Scheme Revenue Potential</p>
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                Cashflow Forecast
              </Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border/60">
                <span className="text-sm text-muted-foreground">Total Active Chits</span>
                <span className="font-extrabold text-foreground">{activeChits.length}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/60">
                <span className="text-sm text-muted-foreground">Monthly Commitment</span>
                <span className="font-extrabold text-amber-600 dark:text-amber-400">{formatINR(totalActiveInstallments)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/60">
                <span className="text-sm text-muted-foreground">Annual Inflow (Est.)</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{formatINR(totalActiveInstallments * 12)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Avg. Installment per Member</span>
                <span className="font-extrabold text-foreground">
                  {activeChits.length > 0 ? formatINR(totalActiveInstallments / activeChits.length) : '—'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <div className="border-t border-border/60" />

      {/* ══════════════════════════════════════════════════════
          REPORT 4 — Upcoming Maturities (30 & 60 days)
      ══════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <SectionHeader
            icon={<Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
            title="Upcoming Maturities"
            subtitle="Schemes maturing in the next 30 to 60 days — prepare redemptions"
            badge={`${upcomingMaturities.length} maturing`}
          />
          <Button variant="outline" size="sm" onClick={handleExportMaturities} className="shrink-0 ml-2">
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl border border-orange-400/30 bg-orange-400/8 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Next 30 Days</p>
            <p className="text-2xl font-extrabold text-orange-600 dark:text-orange-400 mt-1">{maturitiesNext30.length}</p>
            <p className="text-[10px] text-muted-foreground">schemes maturing</p>
          </div>
          <div className="rounded-xl border border-blue-400/30 bg-blue-400/8 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">31–60 Days</p>
            <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{maturitiesNext60.length}</p>
            <p className="text-[10px] text-muted-foreground">upcoming</p>
          </div>
        </div>

        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border">
            <p className="text-sm font-bold text-foreground">Maturity Schedule</p>
          </div>
          <div className="overflow-auto max-h-[300px]">
            {upcomingMaturities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No upcoming maturities in 60 days</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2.5 font-semibold text-muted-foreground">Customer</th>
                    <th className="text-left p-2.5 font-semibold text-muted-foreground">Scheme</th>
                    <th className="text-right p-2.5 font-semibold text-muted-foreground">Monthly</th>
                    <th className="text-right p-2.5 font-semibold text-muted-foreground">Matures</th>
                    <th className="text-center p-2.5 font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {upcomingMaturities.map((c, i) => {
                    const daysLeft = Math.ceil((new Date(c.maturity_date).getTime() - Date.now()) / 86400000)
                    const urgent = daysLeft <= 30
                    return (
                      <tr key={i} className="hover:bg-muted/30 transition-colors">
                        <td className="p-2.5">
                          <p className="font-medium text-foreground">{c.customer?.name ?? '—'}</p>
                          <p className="text-muted-foreground">{c.customer?.phone ?? ''}</p>
                        </td>
                        <td className="p-2.5 text-muted-foreground">{c.scheme?.name ?? '—'}</td>
                        <td className="p-2.5 text-right font-bold text-amber-600 dark:text-amber-400">{formatINR(c.agreed_amount)}</td>
                        <td className="p-2.5 text-right">
                          <p className="font-medium text-foreground">{formatDate(c.maturity_date)}</p>
                          <p className={urgent ? 'text-orange-500 font-semibold' : 'text-muted-foreground'}>{daysLeft}d left</p>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${urgent ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400' : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'}`}>
                            {urgent ? 'Soon' : 'Upcoming'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </section>

      <div className="border-t border-border/60" />

      {/* ══════════════════════════════════════════════════════
          REPORT 5 — Gold Rate History (30 days)
      ══════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          icon={<Coins className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
          title="Gold Rate History"
          subtitle="22K, 24K & Silver rate trend over the last 30 days"
          badge={`${goldHistory.length} records`}
        />

        {goldHistory.length === 0 ? (
          <Card className="p-8 text-center">
            <Coins className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No gold rate records found for last 30 days</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard
                label="Latest 22K"
                value={`${formatINR(goldHistory[goldHistory.length - 1]?.rate_22k ?? 0)}/g`}
                sub={formatDate(goldHistory[goldHistory.length - 1]?.date)}
                accent
              />
              <KPICard
                label="Latest 24K"
                value={`${formatINR(goldHistory[goldHistory.length - 1]?.rate_24k ?? 0)}/g`}
                sub="Pure gold"
              />
              <KPICard
                label="30d High (22K)"
                value={`${formatINR(Math.max(...goldHistory.map(r => r.rate_22k)))}/g`}
                sub="Highest rate"
              />
              <KPICard
                label="30d Low (22K)"
                value={`${formatINR(Math.min(...goldHistory.map(r => r.rate_22k)))}/g`}
                sub="Lowest rate"
              />
            </div>

            {/* Line chart */}
            <Card className="p-5">
              <p className="text-sm font-bold text-foreground mb-3">22K & 24K Rate Trend</p>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={goldHistory} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={d => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    interval="preserveStartEnd"
                  />
                  <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(1)}k`} tick={{ fontSize: 10 }} />
                  <Tooltip
                    labelFormatter={d => formatDate(d)}
                    formatter={(v: any, name: string) => [formatINR(v), name === 'rate_22k' ? '22K' : '24K']}
                    contentStyle={{ borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Legend formatter={v => v === 'rate_22k' ? '22K Gold' : '24K Gold'} />
                  <Line type="monotone" dataKey="rate_22k" stroke="#DAA520" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="rate_24k" stroke="#F0C040" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}
      </section>

      <div className="border-t border-border/60" />

      {/* ══════════════════════════════════════════════════════
          REPORT 6 — Customer City Distribution
      ══════════════════════════════════════════════════════ */}
      <section>
        <SectionHeader
          icon={<Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
          title="Customer Distribution"
          subtitle="Customer count by city and monthly enrollment trend"
          badge={`${customers.length} customers`}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* City bar chart */}
          <Card className="p-5">
            <p className="text-sm font-bold text-foreground mb-3">Top Cities</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topCities} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="city" type="category" tick={{ fontSize: 11 }} width={70} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
                <Bar dataKey="count" fill="#DAA520" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Recently joined table */}
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-border">
              <p className="text-sm font-bold text-foreground">Recently Enrolled</p>
            </div>
            <div className="overflow-auto max-h-[240px]">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2.5 font-semibold text-muted-foreground">Name</th>
                    <th className="text-left p-2.5 font-semibold text-muted-foreground">Phone</th>
                    <th className="text-right p-2.5 font-semibold text-muted-foreground">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.slice(0, 20).map((c, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="p-2.5 font-medium text-foreground">{c.name}</td>
                      <td className="p-2.5 text-muted-foreground">{c.phone}</td>
                      <td className="p-2.5 text-right text-muted-foreground">{formatDate(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </section>

      <div className="border-t border-border/60" />

      {/* ══════════════════════════════════════════════════════
          REPORT 7 — Defaulted / Closed Chits
      ══════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <SectionHeader
            icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
            title="Defaulted & Closed Chits"
            subtitle="Members with defaulted or manually closed schemes — requires attention"
            badge={`${defaultedChits.length} records`}
          />
          <Button variant="outline" size="sm" onClick={handleExportDefaulted} className="shrink-0 ml-2" disabled={!defaultedChits.length}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Export
          </Button>
        </div>

        {defaultedChits.length === 0 ? (
          <Card className="p-8 text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500" />
            <p className="text-sm font-semibold text-foreground">All clean!</p>
            <p className="text-xs text-muted-foreground">No defaulted or closed chits found.</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-auto max-h-[300px]">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2.5 font-semibold text-muted-foreground">Customer</th>
                    <th className="text-left p-2.5 font-semibold text-muted-foreground">Scheme</th>
                    <th className="text-right p-2.5 font-semibold text-muted-foreground">Monthly</th>
                    <th className="text-right p-2.5 font-semibold text-muted-foreground">Start</th>
                    <th className="text-center p-2.5 font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {defaultedChits.map((c, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="p-2.5">
                        <p className="font-medium text-foreground">{c.customer?.name ?? '—'}</p>
                        <p className="text-muted-foreground">{c.customer?.phone ?? ''}</p>
                      </td>
                      <td className="p-2.5 text-muted-foreground">{c.scheme?.name ?? '—'}</td>
                      <td className="p-2.5 text-right font-bold text-foreground">{formatINR(c.agreed_amount)}</td>
                      <td className="p-2.5 text-right text-muted-foreground">{formatDate(c.start_date)}</td>
                      <td className="p-2.5 text-center">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                          style={{ background: `${STATUS_COLORS[c.status]}20`, color: STATUS_COLORS[c.status] }}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </div>
  )
}
