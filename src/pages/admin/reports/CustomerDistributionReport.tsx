import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ArrowLeft, Users, MapPin } from 'lucide-react'
import { CustomerRow } from './reportUtils'

export const CustomerDistributionReport: React.FC = () => {
  const { data: customers = [], isLoading } = useQuery({
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

  const cityBreakdown = customers.reduce((acc: Record<string, number>, c) => {
    const city = c.city || 'Unknown'
    acc[city] = (acc[city] ?? 0) + 1
    return acc
  }, {})

  const topCities = Object.entries(cityBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([city, count]) => ({ city, count }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/reports" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Customer Distribution Report</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Demographics and city-wise customer spread</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}
          className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-4 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total Enrolled Members</p>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{customers.length}</p>
          <p className="text-[10px] text-muted-foreground">Registered customers</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, duration: 0.3 }}
          className="rounded-xl border border-border bg-card p-4 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Cities Covered</p>
          <p className="text-2xl font-extrabold text-foreground">{Object.keys(cityBreakdown).length}</p>
          <p className="text-[10px] text-muted-foreground">Unique locations</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, duration: 0.3 }}
          className="rounded-xl border border-border bg-card p-4 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Top Location</p>
          <p className="text-2xl font-extrabold text-foreground">{topCities[0]?.city ?? '—'}</p>
          <p className="text-[10px] text-muted-foreground">{topCities[0]?.count ?? 0} customers</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="p-5">
            <p className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-amber-500" /> Customer Count by City
            </p>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topCities} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="city" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
                  <Bar dataKey="count" fill="#DAA520" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-500" /> Recently Joined Members
              </p>
              <span className="text-xs text-muted-foreground">{customers.length} Total</span>
            </div>
            <div className="overflow-auto max-h-[260px]">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2.5 font-semibold text-muted-foreground">Name</th>
                    <th className="text-left p-2.5 font-semibold text-muted-foreground">Phone</th>
                    <th className="text-left p-2.5 font-semibold text-muted-foreground">City</th>
                    <th className="text-right p-2.5 font-semibold text-muted-foreground">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.slice(0, 20).map((c, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="p-2.5 font-medium text-foreground">{c.name}</td>
                      <td className="p-2.5 text-muted-foreground">{c.phone}</td>
                      <td className="p-2.5 text-muted-foreground">{c.city || '—'}</td>
                      <td className="p-2.5 text-right text-muted-foreground">{formatDate(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
