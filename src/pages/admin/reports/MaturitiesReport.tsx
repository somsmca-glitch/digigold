import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatINR, formatDate } from '@/lib/utils'
import { ArrowLeft, Download, Calendar } from 'lucide-react'
import { ChitRow, exportCSV } from './reportUtils'

const rowVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({ opacity: 1, x: 0, transition: { delay: i * 0.03, duration: 0.25 } }),
}

export const MaturitiesReport: React.FC = () => {
  const todayStr = new Date().toISOString().split('T')[0]
  const next30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const next60 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: upcomingMaturities = [], isLoading } = useQuery({
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

  const maturitiesNext30 = upcomingMaturities.filter(c => c.maturity_date <= next30)
  const maturitiesNext60 = upcomingMaturities.filter(c => c.maturity_date > next30)

  const statCards = [
    { label: 'Next 30 Days', value: maturitiesNext30.length, color: 'orange' },
    { label: '31–60 Days', value: maturitiesNext60.length, color: 'blue' },
    { label: 'Total Maturing', value: upcomingMaturities.length, color: 'amber' },
    {
      label: 'Est. Redemption Value',
      value: formatINR(upcomingMaturities.reduce((s, c) => {
        const months = c.scheme?.duration_months ?? 0
        return s + (c.agreed_amount ?? 0) * months
      }, 0)),
      color: 'emerald',
    },
  ]

  const colorMap: Record<string, string> = {
    orange: 'border-orange-400/30 bg-orange-400/8 text-orange-600 dark:text-orange-400',
    blue:   'border-blue-400/30   bg-blue-400/8   text-blue-600   dark:text-blue-400',
    amber:  'border-amber-500/30  bg-amber-500/8  text-amber-600  dark:text-amber-400',
    emerald:'border-emerald-500/30 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/admin/reports" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Upcoming Maturities</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Schemes maturing in the next 30–60 days</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportCSV('maturities_60d.csv', upcomingMaturities.map(c => ({
          Customer: c.customer?.name ?? '', Phone: c.customer?.phone ?? '',
          Scheme: c.scheme?.name ?? '', Maturity_Date: c.maturity_date, Monthly: c.agreed_amount ?? 0
        })))} disabled={!upcomingMaturities.length}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Export
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s, i) => (
          <motion.div key={s.label} custom={i}
            initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.07, duration: 0.3 }}
            className={`rounded-xl border p-4 space-y-1 ${colorMap[s.color]}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-extrabold ${colorMap[s.color].split(' ').slice(-2).join(' ')}`}>
              {typeof s.value === 'number' ? s.value : s.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-bold text-foreground">Maturity Schedule</p>
          </div>
          <div className="overflow-auto max-h-[420px]">
            {isLoading ? (
              <div className="p-6 space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-10 rounded-lg bg-muted/50 animate-pulse" />)}</div>
            ) : upcomingMaturities.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">No maturities in next 60 days</div>
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Customer</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Scheme</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground">Monthly</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground">Matures</th>
                    <th className="text-center p-3 font-semibold text-muted-foreground">Days Left</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {upcomingMaturities.map((c, i) => {
                    const daysLeft = Math.ceil((new Date(c.maturity_date).getTime() - Date.now()) / 86400000)
                    const urgent = daysLeft <= 30
                    return (
                      <motion.tr key={i} custom={i} variants={rowVariants} initial="hidden" animate="visible"
                        className="hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <p className="font-medium text-foreground">{c.customer?.name ?? '—'}</p>
                          <p className="text-muted-foreground">{c.customer?.phone ?? ''}</p>
                        </td>
                        <td className="p-3 text-muted-foreground">{c.scheme?.name ?? '—'}</td>
                        <td className="p-3 text-right font-bold text-amber-600 dark:text-amber-400">{formatINR(c.agreed_amount)}</td>
                        <td className="p-3 text-right">
                          <p className="font-medium text-foreground">{formatDate(c.maturity_date)}</p>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${urgent
                            ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                            : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'}`}>
                            {daysLeft}d {urgent ? '⚠' : ''}
                          </span>
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
