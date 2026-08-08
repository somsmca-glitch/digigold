import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatINR, formatDate } from '@/lib/utils'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import {
  ArrowLeft, Layers, Sparkles, TrendingUp, Award, Clock,
  CheckCircle2, AlertTriangle, ShieldCheck, Search, Download,
  Coins, Scale, ArrowUpRight, Filter, Wallet, Calendar
} from 'lucide-react'
import { ChitRow, STATUS_COLORS, exportCSV } from './reportUtils'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

export const SchemeStatusReport: React.FC = () => {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Fetch Gold Rate for 22K calculations
  const { data: goldRate } = useQuery({
    queryKey: ['latest-gold-rate-report'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gold_rates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data?.rate_22k || 12800
    },
  })

  // Fetch All Schemes for map lookup
  const { data: schemes = [] } = useQuery({
    queryKey: ['report-schemes-all-lookup'],
    queryFn: async () => {
      const { data } = await supabase.from('chit_schemes').select('*')
      return data ?? []
    },
  })

  // Fetch All Customers for map lookup
  const { data: customers = [] } = useQuery({
    queryKey: ['report-customers-all-lookup'],
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('id, name, phone, city')
      return data ?? []
    },
  })

  // Fetch All Customer Chits with relation embed & resilient fallback
  const { data: rawChits = [], isLoading } = useQuery({
    queryKey: ['report-all-chits-full-resilient'],
    queryFn: async () => {
      let { data, error } = await supabase
        .from('customer_chits')
        .select('*, scheme:chit_schemes(*)')
        .order('created_at', { ascending: false })

      if (error) {
        // Fallback without relation embed if FK constraint is unmapped in PostgREST
        const fallback = await supabase
          .from('customer_chits')
          .select('*')
          .order('created_at', { ascending: false })
        data = fallback.data
      }
      return (data ?? []) as any[]
    },
  })

  // Resiliently merge Customer and Scheme info onto chits
  const allChits = useMemo(() => {
    const custMap = new Map(customers.map((c) => [c.id, c]))
    const schemeMap = new Map(schemes.map((s) => [s.id, s]))

    return rawChits.map((c: any) => {
      const cust = c.customer || custMap.get(c.customer_id)
      const sch = c.scheme || schemeMap.get(c.scheme_id)
      return {
        ...c,
        scheme: sch ? { name: sch.name, duration_months: sch.duration_months || 11, type: sch.type || 'gold_rate_linked' } : undefined,
        customer: cust ? { id: cust.id, name: cust.name, phone: cust.phone, city: cust.city } : undefined,
      } as ChitRow
    })
  }, [rawChits, customers, schemes])

  // Fetch All Payments from DB
  const { data: allPayments = [] } = useQuery({
    queryKey: ['report-all-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('amount, chit_id, payment_mode, payment_date')
      if (error) throw error
      return data ?? []
    },
  })

  // Total Payments Collected directly from DB
  const totalActualCollectedDB = useMemo(() => {
    return allPayments.reduce((acc, p) => acc + (p.amount || 0), 0)
  }, [allPayments])

  // Actual Accumulated 22K Gold Weight from Collected Funds
  const actualGoldGramsDB = useMemo(() => {
    return (goldRate || 12800) > 0 ? (totalActualCollectedDB / (goldRate || 12800)).toFixed(2) : '0.00'
  }, [totalActualCollectedDB, goldRate])

  // Payment Mode Breakdown directly from DB
  const paymentModeData = useMemo(() => {
    const modes: Record<string, number> = {}
    allPayments.forEach(p => {
      const mode = (p.payment_mode || 'cash').toUpperCase()
      modes[mode] = (modes[mode] || 0) + (p.amount || 0)
    })
    return Object.entries(modes).map(([name, value]) => ({ name, value }))
  }, [allPayments])

  // Relevant Calculations & Relevant KPIs
  const activeChits = useMemo(() => allChits.filter(c => c.status === 'active'), [allChits])
  const redeemedChits = useMemo(() => allChits.filter(c => c.status === 'redeemed'), [allChits])
  const closedChits = useMemo(() => allChits.filter(c => c.status === 'closed'), [allChits])
  const defaultedChits = useMemo(() => allChits.filter(c => c.status === 'defaulted'), [allChits])

  const totalActiveInstallments = useMemo(() => activeChits.reduce((s, c) => s + (c.agreed_amount ?? 0), 0), [activeChits])
  const annualCashflowEst = totalActiveInstallments * 12
  const avgInstallment = activeChits.length > 0 ? totalActiveInstallments / activeChits.length : 0

  // Estimated Total Maturity Value across active chits assuming duration * installment
  const estTotalActiveValue = useMemo(() => {
    return activeChits.reduce((s, c) => {
      const months = c.scheme?.duration_months || 11
      const amt = c.agreed_amount || 0
      return s + (amt * months)
    }, 0)
  }, [activeChits])

  const estTotalGoldGrams = useMemo(() => {
    return (goldRate || 12800) > 0 ? (estTotalActiveValue / (goldRate || 12800)).toFixed(2) : '0.00'
  }, [estTotalActiveValue, goldRate])

  const completionRate = useMemo(() => {
    const totalEnded = redeemedChits.length + closedChits.length + defaultedChits.length
    if (totalEnded === 0) return 100
    return ((redeemedChits.length / totalEnded) * 100).toFixed(1)
  }, [redeemedChits, closedChits, defaultedChits])

  // Status breakdown data for pie chart
  const statusBreakdown = useMemo(() => {
    return allChits.reduce((acc: Record<string, number>, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1
      return acc
    }, { active: 0, redeemed: 0, closed: 0, defaulted: 0 })
  }, [allChits])

  const statusPieData = useMemo(() => {
    return Object.entries(statusBreakdown)
      .filter(([_, val]) => val > 0)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        key: name,
      }))
  }, [statusBreakdown])

  // Duration Breakdown for Bar Chart
  const durationData = useMemo(() => {
    const counts: Record<string, number> = {}
    allChits.forEach((c) => {
      const label = `${c.scheme?.duration_months || 11} Months`
      counts[label] = (counts[label] || 0) + 1
    })
    return Object.entries(counts).map(([name, count]) => ({ name, count }))
  }, [allChits])

  // Filtered chits table list
  const filteredChits = useMemo(() => {
    return allChits.filter((c) => {
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter
      const q = search.toLowerCase().trim()
      const matchesSearch =
        !q ||
        (c.customer?.name || '').toLowerCase().includes(q) ||
        (c.customer?.phone || '').toLowerCase().includes(q) ||
        (c.scheme?.name || '').toLowerCase().includes(q)
      return matchesStatus && matchesSearch
    })
  }, [allChits, statusFilter, search])

  const handleExport = () => {
    const rows = filteredChits.map((c) => ({
      'Chit ID': c.id,
      'Customer Name': c.customer?.name || 'N/A',
      'Customer Phone': c.customer?.phone || 'N/A',
      'Scheme Name': c.scheme?.name || 'N/A',
      'Duration (Months)': c.scheme?.duration_months || 11,
      'Monthly Installment (INR)': c.agreed_amount || 0,
      'Status': c.status.toUpperCase(),
      'Start Date': formatDate(c.start_date),
      'Maturity Date': formatDate(c.maturity_date),
    }))
    exportCSV('Scheme_Status_Overview_Report.csv', rows)
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-12"
    >
      {/* ── Executive Hero Header ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/15 via-amber-500/8 to-background border border-amber-500/30 p-6 md:p-8 shadow-md">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Link
                to="/admin/reports"
                className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs px-3 py-1 font-bold tracking-wide uppercase">
                Chit Portfolio Analytics
              </Badge>
            </div>
            <h1 className="font-heading text-2xl md:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
              <Layers className="h-8 w-8 text-amber-500 shrink-0" /> Scheme Status Overview
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Real-time executive performance dashboard monitoring active commitments, liquidity forecasts, gold weight accumulations, and chit maturity health.
            </p>
          </div>

          {/* Action buttons & Gold Rate ticker */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <div className="p-3.5 rounded-2xl bg-card/80 border border-amber-500/30 text-center sm:text-right shadow-sm backdrop-blur-sm">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400 flex items-center justify-center sm:justify-end gap-1">
                <Coins className="h-3 w-3" /> Live 22K Gold Rate
              </p>
              <p className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">{formatINR(goldRate)}/g</p>
            </div>
            <Button
              onClick={handleExport}
              className="gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-bold shadow-lg shadow-amber-500/20"
            >
              <Download className="h-4 w-4" /> Export CSV Report
            </Button>
          </div>
        </div>
      </div>

      {/* ── Relevant Executive KPIs Grid (DB Synced) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Plans */}
        <motion.div variants={itemVariants}>
          <Card className="relative overflow-hidden border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-background p-5 space-y-2 shadow-md hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Enrolled Chits</span>
              <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="h-4.5 w-4.5" />
              </div>
            </div>
            <p className="text-3xl font-black text-foreground">{activeChits.length}</p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> {((activeChits.length / (allChits.length || 1)) * 100).toFixed(0)}% of total portfolio
            </p>
          </Card>
        </motion.div>

        {/* KPI 2: Realized DB Collections */}
        <motion.div variants={itemVariants}>
          <Card className="relative overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-background p-5 space-y-2 shadow-md hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Realized DB Collections</span>
              <div className="h-8 w-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                <Wallet className="h-4.5 w-4.5" />
              </div>
            </div>
            <p className="text-3xl font-black text-amber-600 dark:text-amber-400">{formatINR(totalActualCollectedDB)}</p>
            <p className="text-[11px] text-muted-foreground font-medium">{allPayments.length} DB payments synced</p>
          </Card>
        </motion.div>

        {/* KPI 3: Accumulated 22K Gold Weight */}
        <motion.div variants={itemVariants}>
          <Card className="relative overflow-hidden border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 via-card to-background p-5 space-y-2 shadow-md hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Accumulated 22K Gold</span>
              <div className="h-8 w-8 rounded-xl bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 flex items-center justify-center">
                <Scale className="h-4.5 w-4.5" />
              </div>
            </div>
            <p className="text-3xl font-black text-foreground">≈ {actualGoldGramsDB}<span className="text-base font-bold text-amber-500 ml-1">g</span></p>
            <p className="text-[11px] text-muted-foreground font-medium">Realized gold weight from DB</p>
          </Card>
        </motion.div>

        {/* KPI 4: Monthly Commitment */}
        <motion.div variants={itemVariants}>
          <Card className="relative overflow-hidden border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-card to-background p-5 space-y-2 shadow-md hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Monthly Cash Commitment</span>
              <div className="h-8 w-8 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center">
                <ArrowUpRight className="h-4.5 w-4.5" />
              </div>
            </div>
            <p className="text-3xl font-black text-blue-600 dark:text-blue-400">{formatINR(totalActiveInstallments)}</p>
            <p className="text-[11px] text-muted-foreground font-medium">Est. Annual: {formatINR(annualCashflowEst)}</p>
          </Card>
        </motion.div>
      </div>

      {/* ── Status Stat Pills ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active Schemes', count: statusBreakdown.active || 0, color: '#10b981', sub: 'Ongoing collections' },
          { label: 'Redeemed / Completed', count: statusBreakdown.redeemed || 0, color: '#3b82f6', sub: 'Full term fulfilled' },
          { label: 'Closed Early', count: statusBreakdown.closed || 0, color: '#8b5cf6', sub: 'Settled by customer' },
          { label: 'Defaulted / Lapsed', count: statusBreakdown.defaulted || 0, color: '#ef4444', sub: 'Payment delayed' },
        ].map((st) => (
          <div
            key={st.label}
            className="rounded-2xl border p-4 transition-all hover:scale-[1.02]"
            style={{ borderColor: `${st.color}35`, background: `${st.color}08` }}
          >
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">{st.label}</p>
            <p className="text-3xl font-black mt-1" style={{ color: st.color }}>{st.count}</p>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{st.sub}</p>
          </div>
        ))}
      </motion.div>

      {/* ── Charts Section (DB Synced) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Donut Status Distribution */}
        <motion.div variants={itemVariants}>
          <Card className="p-5 space-y-4 border-amber-500/20 shadow-md">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-heading font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-amber-500" /> Status Distribution
                </h3>
                <p className="text-[11px] text-muted-foreground">Split across scheme status categories</p>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold border-amber-500/30 text-amber-600 dark:text-amber-400">
                {allChits.length} Plans
              </Badge>
            </div>

            <ResponsiveContainer width="100%" height={240}>
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
                  {statusPieData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.key] || '#DAA520'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Chart 2: Plan Duration Popularity */}
        <motion.div variants={itemVariants}>
          <Card className="p-5 space-y-4 border-amber-500/20 shadow-md">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-heading font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                  <BarChart className="h-4 w-4 text-amber-500" /> Tenure Duration Spread
                </h3>
                <p className="text-[11px] text-muted-foreground">Enrolled scheme count by duration</p>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                Tenure Insights
              </Badge>
            </div>

            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={durationData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  formatter={(v: any) => [`${v} Enrollments`, 'Count']}
                  contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#DAA520" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Chart 3: Realized Collections by Payment Mode (DB Synced) */}
        <motion.div variants={itemVariants}>
          <Card className="p-5 space-y-4 border-amber-500/20 shadow-md">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-heading font-bold text-sm sm:text-base text-foreground flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-amber-500" /> Collections by Mode (DB)
                </h3>
                <p className="text-[11px] text-muted-foreground">DB payment breakdown by payment mode</p>
              </div>
              <Badge variant="outline" className="text-[10px] font-bold border-blue-500/30 text-blue-600 dark:text-blue-400">
                DB Synced
              </Badge>
            </div>

            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={paymentModeData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v: any) => [formatINR(v), 'Total Collected']}
                  contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      </div>

      {/* ── Filterable Master Scheme Table ── */}
      <motion.div variants={itemVariants}>
        <Card className="p-6 space-y-5 border-amber-500/20 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h3 className="font-heading font-extrabold text-lg text-foreground flex items-center gap-2">
                <Layers className="h-5 w-5 text-amber-500" /> Scheme Status Master Ledger
              </h3>
              <p className="text-xs text-muted-foreground">Comprehensive list of all customer chit plans and fulfillment metrics</p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {['all', 'active', 'redeemed', 'closed', 'defaulted'].map((st) => (
                <Button
                  key={st}
                  variant={statusFilter === st ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(st)}
                  className={`text-xs h-8 capitalize font-bold ${
                    statusFilter === st
                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {st}
                </Button>
              ))}
            </div>
          </div>

          {/* Search input */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search member name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Member Name &amp; Contact</th>
                  <th className="p-3">Scheme Plan</th>
                  <th className="p-3 text-right">Monthly Installment</th>
                  <th className="p-3 text-right">Maturity Pool (Est.)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3">Start Date</th>
                  <th className="p-3">Maturity Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      Loading scheme status records...
                    </td>
                  </tr>
                ) : filteredChits.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No customer chit schemes match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredChits.map((c) => {
                    const stColor = STATUS_COLORS[c.status] || '#6b7280'
                    const months = c.scheme?.duration_months || 11
                    const estPool = (c.agreed_amount || 0) * months
                    return (
                      <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                        <td className="p-3">
                          <Link to={`/admin/customers/${(c as any).customer_id || (c as any).customer?.id || ''}`} className="font-bold text-foreground hover:text-amber-500 transition-colors">
                            {c.customer?.name || 'Customer'}
                          </Link>
                          <p className="text-[10px] text-muted-foreground">{c.customer?.phone || 'No Phone'}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-foreground">{c.scheme?.name || 'Chit Scheme'}</p>
                          <p className="text-[10px] text-muted-foreground">{months} Months Tenure</p>
                        </td>
                        <td className="p-3 text-right font-extrabold text-amber-600 dark:text-amber-400">
                          {formatINR(c.agreed_amount || 0)}
                        </td>
                        <td className="p-3 text-right font-extrabold text-foreground">
                          {formatINR(estPool)}
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            className="capitalize text-[10px] font-extrabold px-2 py-0.5"
                            style={{
                              backgroundColor: `${stColor}20`,
                              color: stColor,
                              borderColor: `${stColor}40`,
                            }}
                          >
                            {c.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">{formatDate(c.start_date)}</td>
                        <td className="p-3 text-muted-foreground">{formatDate(c.maturity_date)}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  )
}
