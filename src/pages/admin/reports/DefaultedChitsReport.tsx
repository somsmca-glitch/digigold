import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatINR, formatDate } from '@/lib/utils'
import { ArrowLeft, Download, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { ChitRow, exportCSV, STATUS_COLORS } from './reportUtils'

export const DefaultedChitsReport: React.FC = () => {
  const { data: defaultedChits = [], isLoading } = useQuery({
    queryKey: ['report-defaulted'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_chits')
        .select('*, scheme:chit_schemes(name), customer:customers(name, phone)')
        .in('status', ['defaulted', 'closed'])
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as ChitRow[]
    },
  })

  const defaultedCount = defaultedChits.filter(c => c.status === 'defaulted').length
  const closedCount = defaultedChits.filter(c => c.status === 'closed').length
  const totalAmountAtRisk = defaultedChits
    .filter(c => c.status === 'defaulted')
    .reduce((acc, c) => acc + (c.agreed_amount ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/admin/reports" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Defaulted & Closed Chits Report</h1>
            <p className="text-sm text-muted-foreground mt-0.5">High risk & terminated member account audit</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            exportCSV(
              'defaulted_chits.csv',
              defaultedChits.map(c => ({
                Customer: c.customer?.name ?? '',
                Phone: c.customer?.phone ?? '',
                Scheme: c.scheme?.name ?? '',
                Status: c.status,
                AgreedAmount: c.agreed_amount ?? 0,
                StartDate: c.start_date,
                MaturityDate: c.maturity_date,
              }))
            )
          }
          disabled={!defaultedChits.length}
        >
          <Download className="h-3.5 w-3.5 mr-1.5" /> Export
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}
          className="rounded-xl border border-red-500/30 bg-red-500/8 p-4 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Defaulted Accounts</p>
          <p className="text-2xl font-extrabold text-red-600 dark:text-red-400">{defaultedCount}</p>
          <p className="text-[10px] text-muted-foreground">Active default status</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.3 }}
          className="rounded-xl border border-border bg-card p-4 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Closed Accounts</p>
          <p className="text-2xl font-extrabold text-foreground">{closedCount}</p>
          <p className="text-[10px] text-muted-foreground">Manually closed schemes</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.3 }}
          className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-4 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Default Monthly Value</p>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{formatINR(totalAmountAtRisk)}</p>
          <p className="text-[10px] text-muted-foreground">Monthly unpaid commitment</p>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <p className="text-sm font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" /> Defaulted & Closed Chit Log
            </p>
            <span className="text-xs text-muted-foreground">{defaultedChits.length} Records</span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading audit records...</div>
          ) : defaultedChits.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500" />
              <p className="font-bold text-base text-foreground">Zero Defaulted Accounts</p>
              <p className="text-xs text-muted-foreground">All chit accounts are active or successfully redeemed.</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[380px]">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Customer</th>
                    <th className="text-left p-3 font-semibold text-muted-foreground">Scheme</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground">Monthly Agreed</th>
                    <th className="text-right p-3 font-semibold text-muted-foreground">Start Date</th>
                    <th className="text-center p-3 font-semibold text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {defaultedChits.map((c, i) => (
                    <tr key={c.id || i} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <p className="font-medium text-foreground">{c.customer?.name ?? 'Unknown Customer'}</p>
                        <p className="text-muted-foreground">{c.customer?.phone ?? ''}</p>
                      </td>
                      <td className="p-3 text-muted-foreground">{c.scheme?.name ?? '—'}</td>
                      <td className="p-3 text-right font-bold text-foreground">{formatINR(c.agreed_amount)}</td>
                      <td className="p-3 text-right text-muted-foreground">{formatDate(c.start_date)}</td>
                      <td className="p-3 text-center">
                        <span
                          className="text-[10px] font-bold px-2.5 py-1 rounded-full capitalize"
                          style={{
                            backgroundColor: `${STATUS_COLORS[c.status] || '#6b7280'}20`,
                            color: STATUS_COLORS[c.status] || '#6b7280',
                          }}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  )
}
