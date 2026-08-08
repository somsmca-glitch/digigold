import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatINR, formatDate } from '@/lib/utils'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Download, RefreshCw, ArrowLeft, IndianRupee, PieChart as PieIcon } from 'lucide-react'
import { exportCSV, GOLD_COLORS } from './reportUtils'

const kpiVariants = {
  hidden: { opacity: 0, scale: 0.93 },
  visible: (i: number) => ({ opacity: 1, scale: 1, transition: { delay: i * 0.07, duration: 0.3, ease: 'easeOut' } }),
}

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({ opacity: 1, x: 0, transition: { delay: i * 0.025, duration: 0.25 } }),
}

export const MonthlyCollectionReport: React.FC = () => {
  const today = new Date()
  const [monthFilter, setMonthFilter] = useState(today.toISOString().slice(0, 7))

  const monthStart = `${monthFilter}-01`
  const monthEnd = new Date(
    parseInt(monthFilter.split('-')[0]),
    parseInt(monthFilter.split('-')[1]),
    0
  ).toISOString().split('T')[0]

  const { data: payments = [], isLoading, refetch } = useQuery({
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

  const total = payments.reduce((s: number, p: any) => s + (p.amount ?? 0), 0)
  const modeMap = payments.reduce((acc: Record<string, number>, p: any) => {
    acc[p.payment_mode] = (acc[p.payment_mode] ?? 0) + p.amount
    return acc
  }, {})
  const pieData = Object.entries(modeMap).map(([name, value]) => ({ name: name.replace('_', ' '), value }))

  const kpis = [
    { label: 'Total Collected', value: formatINR(total), sub: `${payments.length} txns`, accent: true },
    { label: 'Cash', value: formatINR(modeMap['cash'] ?? 0), sub: 'Cash payments' },
    { label: 'UPI / Digital', value: formatINR((modeMap['upi'] ?? 0) + (modeMap['bank_transfer'] ?? 0)), sub: 'UPI + Bank' },
    { label: 'Cheque', value: formatINR(modeMap['cheque'] ?? 0), sub: 'Cheque' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/reports" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Monthly Collection Report</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Installment payments collected — filter by month</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="w-40 text-sm" />
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
        </Button>
        <Button variant="outline" size="sm" onClick={() => exportCSV(`collection_${monthFilter}.csv`, payments.map((p: any) => ({
          Customer: p.customer?.name ?? '', Phone: p.customer?.phone ?? '', Amount: p.amount, Date: p.payment_date, Mode: p.payment_mode
        })))} disabled={!payments.length}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
          <motion.div key={k.label} custom={i} variants={kpiVariants} initial="hidden" animate="visible"
            className={`rounded-xl border p-4 space-y-1 ${k.accent ? 'border-amber-500/30 bg-amber-500/8' : 'border-border bg-card'}`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{k.label}</p>
            <p className={`text-xl font-extrabold ${k.accent ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>{k.value}</p>
            <p className="text-[10px] text-muted-foreground">{k.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Pie chart */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="p-5">
            <p className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-amber-500" /> Payment Mode Split
            </p>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={GOLD_COLORS[i % GOLD_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatINR(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-sm text-muted-foreground py-10">No payments this month</p>}
          </Card>
        </motion.div>

        {/* Table */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <p className="text-sm font-bold">Recent Payments</p>
              <Badge variant="outline" className="text-xs">{payments.length} entries</Badge>
            </div>
            <div className="overflow-auto max-h-[220px]">
              {isLoading ? (
                <div className="p-4 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
              ) : payments.length === 0 ? (
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
                    {payments.slice(0, 30).map((p: any, i: number) => (
                      <motion.tr key={i} custom={i} variants={rowVariants} initial="hidden" animate="visible"
                        className="hover:bg-muted/30 transition-colors">
                        <td className="p-2.5 font-medium text-foreground">{p.customer?.name ?? '—'}</td>
                        <td className="p-2.5 text-right font-bold text-amber-600 dark:text-amber-400">{formatINR(p.amount)}</td>
                        <td className="p-2.5 text-right text-muted-foreground">{formatDate(p.payment_date)}</td>
                        <td className="p-2.5 text-center">
                          <span className="bg-muted rounded px-1.5 py-0.5 capitalize text-foreground">{p.payment_mode?.replace('_', ' ')}</span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
