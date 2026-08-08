import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { GoldRate } from '@/types/database'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatINR, formatDate } from '@/lib/utils'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { ArrowLeft, Coins, Download, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react'
import { exportCSV } from './reportUtils'

// ── Custom Tooltip ────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl shadow-xl p-3 text-xs space-y-1.5 min-w-[160px]">
      <p className="font-bold text-foreground text-[11px] mb-1">
        {formatDate(label as string)}
      </p>
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

// ── KPI Card with trend indicator ────────────────────────────────
const KPICard: React.FC<{
  label: string
  value: string
  sub?: string
  trend?: 'up' | 'down' | null
  trendVal?: string
  accent?: boolean
  delay?: number
}> = ({ label, value, sub, trend, trendVal, accent, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16, scale: 0.94 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, duration: 0.35, ease: 'easeOut' }}
    whileHover={{ scale: 1.03, transition: { duration: 0.15 } }}
    className={`rounded-xl border p-4 space-y-1.5 cursor-default select-none transition-shadow hover:shadow-md ${
      accent ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/12 to-yellow-500/6' : 'border-border bg-card'
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

// ── Main Page ─────────────────────────────────────────────────────
export const GoldRatesReport: React.FC = () => {
  const [days, setDays] = useState<30 | 60 | 90>(30)

  // Uses the SAME query key as GoldRatePage so data is shared from cache
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

  // Filter by selected day range (rates are desc, chart needs asc)
  const filtered = rates.slice(0, days).reverse()

  const latest = rates[0]
  const prev   = rates[1]

  const trend22k: 'up' | 'down' | null = latest && prev
    ? (latest.rate_22k > prev.rate_22k ? 'up' : latest.rate_22k < prev.rate_22k ? 'down' : null)
    : null
  const trendDiff = latest && prev
    ? `${Math.abs(latest.rate_22k - prev.rate_22k).toFixed(0)}/g vs yesterday`
    : undefined

  const high22k = filtered.length ? Math.max(...filtered.map(r => r.rate_22k)) : 0
  const low22k  = filtered.length ? Math.min(...filtered.map(r => r.rate_22k)) : 0

  const kpis = [
    {
      label: 'Latest 22K', accent: true,
      value: latest ? `${formatINR(latest.rate_22k)}/g` : '—',
      sub: latest ? formatDate(latest.date) : '',
      trend: trend22k, trendVal: trendDiff,
    },
    {
      label: 'Latest 24K',
      value: latest ? `${formatINR(latest.rate_24k)}/g` : '—',
      sub: 'Pure gold',
    },
    {
      label: 'Latest 18K',
      value: latest ? `${formatINR(latest.rate_18k)}/g` : '—',
      sub: 'Hallmark 18K',
    },
    {
      label: 'Silver Rate',
      value: latest ? `${formatINR(latest.silver_rate)}/g` : '—',
      sub: 'Silver today',
    },
    {
      label: `${days}d High (22K)`,
      value: high22k ? `${formatINR(high22k)}/g` : '—',
    },
    {
      label: `${days}d Low (22K)`,
      value: low22k ? `${formatINR(low22k)}/g` : '—',
    },
  ]

  const rowVariants = {
    hidden: { opacity: 0, x: -8 },
    visible: (i: number) => ({ opacity: 1, x: 0, transition: { delay: i * 0.03, duration: 0.22 } }),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between gap-3 flex-wrap"
      >
        <div className="flex items-center gap-3">
          <Link to="/admin/reports" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Gold Rate History</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              22K · 24K · 18K · Silver — synced from Rate Settings
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/gold-rate">
            <Button variant="outline" size="sm" className="gap-1.5 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10">
              <ExternalLink className="h-3.5 w-3.5" />
              Rate Settings
            </Button>
          </Link>
          <Button
            variant="outline" size="sm"
            className="gap-1.5"
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
      </motion.div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k, i) => (
          <KPICard key={k.label} {...k} delay={i * 0.06} />
        ))}
      </div>

      {/* Day Range Selector + Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <p className="text-sm font-bold text-foreground flex items-center gap-2">
              <Coins className="h-4 w-4 text-amber-500" /> Rate Trend Chart
            </p>
            <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-muted/30">
              {([30, 60, 90] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    days === d
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="h-72 flex items-center justify-center">
              <div className="flex gap-2">
                {[0,1,2].map(i => (
                  <motion.div key={i} className="h-2 w-2 rounded-full bg-amber-500"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }} />
                ))}
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center gap-2">
              <Coins className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No rate records found</p>
              <Link to="/admin/gold-rate">
                <Button variant="outline" size="sm" className="mt-1">Add Rates</Button>
              </Link>
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
                <YAxis
                  tickFormatter={v => `₹${(v / 1000).toFixed(1)}k`}
                  tick={{ fontSize: 11 }} width={52}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={v => ({
                    rate_22k: '22K Gold', rate_24k: '24K Gold',
                    rate_18k: '18K Gold', silver_rate: 'Silver',
                  }[v] ?? v)}
                />
                <Line type="monotone" dataKey="rate_22k" name="rate_22k" stroke="#DAA520" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="rate_24k" name="rate_24k" stroke="#F0C040" strokeWidth={2} dot={false} strokeDasharray="6 3" activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="rate_18k" name="rate_18k" stroke="#B8860B" strokeWidth={1.8} dot={false} strokeDasharray="3 3" activeDot={{ r: 3 }} />
                <Line type="monotone" dataKey="silver_rate" name="silver_rate" stroke="#94a3b8" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </motion.div>

      {/* Rate History Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <p className="text-sm font-bold text-foreground flex items-center gap-2">
              <Coins className="h-4 w-4 text-amber-500" />
              Rate History <span className="text-muted-foreground font-normal">(last {days} days)</span>
            </p>
            <span className="text-xs text-muted-foreground">{rates.slice(0, days).length} records</span>
          </div>
          <div className="overflow-auto max-h-[380px]">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-9 rounded-lg bg-muted/50 animate-pulse" />
                ))}
              </div>
            ) : rates.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">No rate records yet</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Date</th>
                    <th className="text-right p-3 font-semibold text-amber-600 dark:text-amber-400">22K /g</th>
                    <th className="text-right p-3 font-semibold text-yellow-600 dark:text-yellow-400">24K /g</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground">18K /g</th>
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
                        <td className="p-3 text-right font-bold text-amber-600 dark:text-amber-400">
                          {formatINR(r.rate_22k)}
                        </td>
                        <td className="p-3 text-right font-semibold text-yellow-600 dark:text-yellow-400">
                          {formatINR(r.rate_24k)}
                        </td>
                        <td className="p-3 text-right text-muted-foreground">{formatINR(r.rate_18k)}</td>
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
  )
}
