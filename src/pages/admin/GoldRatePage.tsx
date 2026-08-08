import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { GoldRate } from '@/types/database'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GoldButton } from '@/components/ui/gold-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { formatINR, formatDate } from '@/lib/utils'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import {
  Coins, Sparkles, TrendingUp, TrendingDown,
  Download, History, Edit3, Clock,
} from 'lucide-react'
import { exportCSV } from './reports/reportUtils'

// ── Custom Tooltip ─────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl shadow-xl p-3 text-xs space-y-1.5 min-w-[160px]">
      <p className="font-bold text-foreground text-[11px] mb-1">{formatDate(label as string)}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full inline-block" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </span>
          <span className="font-bold" style={{ color: p.color }}>{formatINR(p.value)}/g</span>
        </div>
      ))}
    </div>
  )
}

// ── KPI Mini Card ──────────────────────────────────────────────────
const KPICard: React.FC<{
  label: string; value: string; sub?: string
  trend?: 'up' | 'down' | null; trendVal?: string; accent?: boolean; delay?: number
}> = ({ label, value, sub, trend, trendVal, accent, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 14, scale: 0.94 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, duration: 0.3, ease: 'easeOut' }}
    whileHover={{ scale: 1.03, transition: { duration: 0.15 } }}
    className={`rounded-xl border p-4 space-y-1.5 cursor-default ${
      accent
        ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/12 to-yellow-500/6'
        : 'border-border bg-card'
    }`}
  >
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
    <p className={`text-xl font-extrabold leading-tight ${accent ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
      {value}
    </p>
    <div className="flex items-center gap-1.5">
      {trend && (
        <span className={`flex items-center gap-0.5 text-[10px] font-bold ${trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>
          {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {trendVal}
        </span>
      )}
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  </motion.div>
)

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export const GoldRatePage: React.FC = () => {
  const queryClient = useQueryClient()
  const todayStr = new Date().toISOString().split('T')[0]

  const [rate22k, setRate22k]       = useState('')
  const [rate24k, setRate24k]       = useState('')
  const [rate18k, setRate18k]       = useState('')
  const [silverRate, setSilverRate] = useState('')
  const [days, setDays]             = useState<30 | 60 | 90>(30)

  // Shared query — fetches up to 90 days for the history tab
  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['gold-rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gold_rates')
        .select('*')
        .order('date', { ascending: false })
        .limit(90)
      if (error) throw error
      return data as GoldRate[]
    },
  })

  // Sync form inputs with latest record
  React.useEffect(() => {
    if (rates.length > 0) {
      const rec = rates.find(r => r.date === todayStr) || rates[0]
      if (rec) {
        setRate22k(rec.rate_22k?.toString() ?? '')
        setRate24k(rec.rate_24k?.toString() ?? '')
        setRate18k(rec.rate_18k?.toString() ?? '')
        setSilverRate(rec.silver_rate?.toString() ?? '')
      }
    }
  }, [rates, todayStr])

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('gold_rates')
        .upsert({
          date: todayStr,
          rate_22k: parseFloat(rate22k),
          rate_24k: parseFloat(rate24k),
          rate_18k: parseFloat(rate18k),
          silver_rate: parseFloat(silverRate),
        }, { onConflict: 'date' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success("Today's Gold & Silver rates updated!")
      queryClient.invalidateQueries({ queryKey: ['gold-rates'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] })
    },
    onError: (err: any) => {
      if (err.message?.includes('row-level security') || err.message?.includes('RLS')) {
        toast.error('Staff RLS Permission Required: Please enable staff write access on gold_rates in Supabase SQL Editor.')
      } else {
        toast.error(err.message || 'Failed to update rate')
      }
    },
  })

  // History tab derived data
  const filtered = rates.slice(0, days).reverse()
  const latest   = rates[0]
  const prev     = rates[1]
  const high22k  = filtered.length ? Math.max(...filtered.map(r => r.rate_22k)) : 0
  const low22k   = filtered.length ? Math.min(...filtered.map(r => r.rate_22k)) : 0

  const diff22k = latest && prev ? latest.rate_22k - prev.rate_22k : null
  const diff24k = latest && prev ? latest.rate_24k - prev.rate_24k : null
  const diffSilver = latest && prev ? latest.silver_rate - prev.silver_rate : null

  const getTrend = (diff: number | null) => diff ? (diff > 0 ? 'up' : 'down') : null
  const getTrendVal = (diff: number | null) => diff !== null ? `${diff > 0 ? '+' : ''}₹${diff.toFixed(0)}/g vs y'day` : undefined

  const kpis = [
    { label: 'Latest 22K', accent: true, value: latest ? `${formatINR(latest.rate_22k)}/g` : '—', sub: prev ? `Y'day: ${formatINR(prev.rate_22k)}` : '', trend: getTrend(diff22k) as any, trendVal: getTrendVal(diff22k) },
    { label: 'Latest 24K', value: latest ? `${formatINR(latest.rate_24k)}/g` : '—', sub: prev ? `Y'day: ${formatINR(prev.rate_24k)}` : 'Pure', trend: getTrend(diff24k) as any, trendVal: getTrendVal(diff24k) },
    { label: 'Silver Today', value: latest ? `${formatINR(latest.silver_rate)}/g` : '—', sub: prev ? `Y'day: ${formatINR(prev.silver_rate)}` : 'Fine Silver', trend: getTrend(diffSilver) as any, trendVal: getTrendVal(diffSilver) },
    { label: `${days}d High`, value: high22k ? `${formatINR(high22k)}/g` : '—', sub: 'Peak 22K rate' },
    { label: `${days}d Low`,  value: low22k  ? `${formatINR(low22k)}/g`  : '—', sub: 'Lowest 22K rate' },
  ]

  const rowVariants = {
    hidden:  { opacity: 0, x: -8 },
    visible: (i: number) => ({ opacity: 1, x: 0, transition: { delay: i * 0.03, duration: 0.22 } }),
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Gold &amp; Silver Rates</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Set daily rates &amp; view historical price trends</p>
        </div>

        <Button
          variant="outline"
          onClick={() => window.dispatchEvent(new Event('trigger-rate-update-dialog'))}
          className="h-9 px-3.5 text-xs font-black gap-2 border-amber-500/40 text-amber-600 dark:text-amber-300 hover:bg-amber-500/10 rounded-xl self-start sm:self-auto cursor-pointer"
        >
          <Clock className="h-4 w-4 text-amber-500" /> Test Twice-Daily Rate Alert Pop-up
        </Button>
      </div>

      <Tabs defaultValue="today" className="w-full">
        <TabsList className="mb-4 h-10">
          <TabsTrigger value="today" className="gap-2 text-sm">
            <Edit3 className="h-4 w-4" /> Today's Rate
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 text-sm">
            <History className="h-4 w-4" /> Rate History
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: Today's Rate ──────────────────────────────────── */}
        <TabsContent value="today">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Entry form */}
            <Card className="p-6 border-amber-500/30">
              <CardHeader className="p-0 mb-5">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  Today's Rate
                  <span className="text-xs font-normal text-muted-foreground ml-1">({formatDate(todayStr)})</span>
                </CardTitle>
              </CardHeader>
              <form
                onSubmit={e => { e.preventDefault(); updateMutation.mutate() }}
                className="space-y-4"
              >
                {[
                  { id: 'r22', label: '22K Gold Rate (₹ per gram)', value: rate22k, set: setRate22k },
                  { id: 'r24', label: '24K Gold Rate (₹ per gram)', value: rate24k, set: setRate24k },
                  { id: 'rsv', label: 'Silver Rate (₹ per gram)',   value: silverRate, set: setSilverRate },
                ].map(f => (
                  <div key={f.id} className="space-y-1.5">
                    <Label htmlFor={f.id} className="text-xs font-semibold">{f.label}</Label>
                    <Input
                      id={f.id} type="number" step="0.01"
                      value={f.value} onChange={e => f.set(e.target.value)}
                      required className="h-9"
                    />
                  </div>
                ))}
                <GoldButton type="submit" className="w-full py-2.5 mt-2" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Updating…' : 'Publish Today\'s Rate'}
                </GoldButton>
              </form>
            </Card>

            {/* Recent table */}
            <Card className="lg:col-span-2 p-6">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="text-base">Rate History (Last 30 Days)</CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">22K Gold (/g)</th>
                      <th className="py-2.5 px-3">24K Gold (/g)</th>
                      <th className="py-2.5 px-3">Silver (/g)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rates.slice(0, 30).map((r, i) => (
                      <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-sm">
                          {formatDate(r.date)}
                          {i === 0 && (
                            <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                              Latest
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-amber-600 dark:text-amber-400">{formatINR(r.rate_22k)}</td>
                        <td className="py-2.5 px-3 text-yellow-600 dark:text-yellow-400">{formatINR(r.rate_24k)}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{formatINR(r.silver_rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ── TAB 2: Rate History ──────────────────────────────────── */}
        <TabsContent value="history">
          <div className="space-y-6">
            {/* Single row KPI grid */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
              {kpis.map((k, i) => <KPICard key={k.label} {...k} delay={i * 0.06} />)}
            </div>

            {/* Chart card */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <p className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Coins className="h-4 w-4 text-amber-500" /> Rate Trend Chart
                  </p>
                  <div className="flex items-center gap-2">
                    {/* Day range toggle */}
                    <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-muted/30">
                      {([30, 60, 90] as const).map(d => (
                        <button
                          key={d}
                          onClick={() => setDays(d)}
                          className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                            days === d ? 'bg-amber-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {d}d
                        </button>
                      ))}
                    </div>
                    <Button
                      variant="outline" size="sm" className="gap-1.5 h-8"
                      disabled={!rates.length}
                      onClick={() => exportCSV(`gold_rates_${days}d.csv`, rates.slice(0, days).map(r => ({
                        Date: r.date,
                        '22K (₹/g)': r.rate_22k,
                        '24K (₹/g)': r.rate_24k,
                        '18K (₹/g)': r.rate_18k,
                        'Silver (₹/g)': r.silver_rate,
                      })))}
                    >
                      <Download className="h-3.5 w-3.5" /> Export
                    </Button>
                  </div>
                </div>

                {isLoading ? (
                  <div className="h-72 flex items-center justify-center">
                    <div className="flex gap-2">
                      {[0, 1, 2].map(i => (
                        <motion.div key={i} className="h-2 w-2 rounded-full bg-amber-500"
                          animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                          transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }} />
                      ))}
                    </div>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="h-72 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Coins className="h-8 w-8 opacity-30" />
                    <p className="text-sm">No rate records for last {days} days</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={filtered} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                      <XAxis
                        dataKey="date" tick={{ fontSize: 10 }}
                        tickFormatter={d => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        interval="preserveStartEnd"
                      />
                      <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(1)}k`} tick={{ fontSize: 11 }} width={52} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend formatter={v => ({ rate_22k: '22K Gold', rate_24k: '24K Gold', silver_rate: 'Silver' }[v] ?? v)} />
                      <Line type="monotone" dataKey="rate_22k" name="rate_22k" stroke="#DAA520" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="rate_24k" name="rate_24k" stroke="#F0C040" strokeWidth={2} dot={false} strokeDasharray="6 3" activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="silver_rate" name="silver_rate" stroke="#94a3b8" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </motion.div>

            {/* Full history table */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
              <Card className="overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Coins className="h-4 w-4 text-amber-500" />
                    Detailed Rate Table
                    <span className="text-muted-foreground font-normal">(last {days} days)</span>
                  </p>
                  <span className="text-xs text-muted-foreground">{rates.slice(0, days).length} records</span>
                </div>
                <div className="overflow-auto max-h-[420px]">
                  {isLoading ? (
                    <div className="p-6 space-y-3">
                      {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-9 rounded-lg bg-muted/50 animate-pulse" />)}
                    </div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="text-left p-3 font-semibold text-muted-foreground">Date</th>
                          <th className="text-right p-3 font-semibold text-amber-600 dark:text-amber-400">22K /g</th>
                          <th className="text-right p-3 font-semibold text-yellow-600 dark:text-yellow-400">24K /g</th>
                          <th className="text-right p-3 font-semibold text-muted-foreground">Silver /g</th>
                          <th className="text-center p-3 font-semibold text-muted-foreground">22K Δ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {rates.slice(0, days).map((r, i) => {
                          const prev = rates[i + 1]
                          const delta = prev ? r.rate_22k - prev.rate_22k : null
                          return (
                            <motion.tr
                              key={r.id} custom={i} variants={rowVariants}
                              initial="hidden" animate="visible"
                              className="hover:bg-muted/30 transition-colors"
                            >
                              <td className="p-3 font-medium text-foreground">
                                {formatDate(r.date)}
                                {i === 0 && (
                                  <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                    Latest
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right font-bold text-amber-600 dark:text-amber-400">{formatINR(r.rate_22k)}</td>
                              <td className="p-3 text-right font-semibold text-yellow-600 dark:text-yellow-400">{formatINR(r.rate_24k)}</td>
                              <td className="p-3 text-right text-muted-foreground">{formatINR(r.silver_rate)}</td>
                              <td className="p-3 text-center">
                                {delta !== null ? (
                                  <span className={`text-[10px] font-bold flex items-center justify-center gap-0.5 ${
                                    delta > 0 ? 'text-emerald-500' : delta < 0 ? 'text-red-500' : 'text-muted-foreground'
                                  }`}>
                                    {delta > 0 ? <TrendingUp className="h-3 w-3" /> : delta < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                                    {delta !== 0 ? `${delta > 0 ? '+' : ''}${delta.toFixed(0)}` : '—'}
                                  </span>
                                ) : <span className="text-muted-foreground">—</span>}
                              </td>
                            </motion.tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card>
            </motion.div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
