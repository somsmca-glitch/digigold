import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { formatINR } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ArrowLeft, TrendingUp } from 'lucide-react'

const kpiVariants = {
  hidden: { opacity: 0, scale: 0.93 },
  visible: (i: number) => ({ opacity: 1, scale: 1, transition: { delay: i * 0.08, duration: 0.3 } }),
}

export const CollectionTrendReport: React.FC = () => {
  const today = new Date()

  const { data: trendData = [], isLoading } = useQuery({
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
          const { data } = await supabase.from('payments').select('amount').gte('payment_date', m.start).lte('payment_date', m.end)
          const total = (data ?? []).reduce((s, p) => s + (p.amount ?? 0), 0)
          return { month: m.label, amount: total }
        })
      )
      return results
    },
  })

  const total = trendData.reduce((s, d) => s + d.amount, 0)
  const max = Math.max(...trendData.map(d => d.amount), 0)
  const avg = trendData.length > 0 ? total / trendData.length : 0

  const kpis = [
    { label: '6-Month Total', value: formatINR(total), accent: true },
    { label: 'Monthly Average', value: formatINR(avg) },
    { label: 'Best Month', value: formatINR(max) },
    { label: 'Months Tracked', value: `${trendData.length}` },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/reports" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">6-Month Collection Trend</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Month-over-month payment collections across all customers</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
          <motion.div key={k.label} custom={i} variants={kpiVariants} initial="hidden" animate="visible"
            className={`rounded-xl border p-4 space-y-1 ${k.accent ? 'border-amber-500/30 bg-amber-500/8' : 'border-border bg-card'}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{k.label}</p>
            <p className={`text-xl font-extrabold ${k.accent ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>{k.value}</p>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-bold text-foreground">Monthly Bar Chart</p>
          </div>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [formatINR(v), 'Collection']} contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="amount" fill="#DAA520" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </motion.div>
    </div>
  )
}
