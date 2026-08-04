import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { GoldRate } from '@/types/database'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GoldButton } from '@/components/ui/gold-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { formatINR, formatDate } from '@/lib/utils'
import { Coins, Sparkles, TrendingUp } from 'lucide-react'

export const GoldRatePage: React.FC = () => {
  const queryClient = useQueryClient()

  const todayStr = new Date().toISOString().split('T')[0]
  const [rate22k, setRate22k] = useState('')
  const [rate24k, setRate24k] = useState('')
  const [rate18k, setRate18k] = useState('')
  const [silverRate, setSilverRate] = useState('')

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['gold-rates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('gold_rates').select('*').order('date', { ascending: false }).limit(30)
      if (error) throw error
      return data as GoldRate[]
    },
  })

  // Sync inputs with latest rate from Supabase if available
  React.useEffect(() => {
    if (rates.length > 0) {
      const todayRecord = rates.find((r) => r.date === todayStr) || rates[0]
      if (todayRecord) {
        setRate22k(todayRecord.rate_22k?.toString() ?? '')
        setRate24k(todayRecord.rate_24k?.toString() ?? '')
        setRate18k(todayRecord.rate_18k?.toString() ?? '')
        setSilverRate(todayRecord.silver_rate?.toString() ?? '')
      }
    }
  }, [rates, todayStr])

  const updateRateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from('gold_rates').upsert({
        date: todayStr,
        rate_22k: parseFloat(rate22k),
        rate_24k: parseFloat(rate24k),
        rate_18k: parseFloat(rate18k),
        silver_rate: parseFloat(silverRate),
      }, { onConflict: 'date' }).select().single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success("Today's Gold & Silver rates updated successfully!")
      queryClient.invalidateQueries({ queryKey: ['gold-rates'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update rate')
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Gold & Silver Rates</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Set daily rates used for gold-rate linked chit plans</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entry Card */}
        <Card className="p-6 border-amber-500/30">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" /> Today's Rate ({formatDate(todayStr)})
            </CardTitle>
          </CardHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              updateRateMutation.mutate()
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>22K Gold Rate (₹ per gram)</Label>
              <Input
                type="number"
                step="0.01"
                value={rate22k}
                onChange={(e) => setRate22k(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>24K Gold Rate (₹ per gram)</Label>
              <Input
                type="number"
                step="0.01"
                value={rate24k}
                onChange={(e) => setRate24k(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>18K Gold Rate (₹ per gram)</Label>
              <Input
                type="number"
                step="0.01"
                value={rate18k}
                onChange={(e) => setRate18k(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Silver Rate (₹ per gram)</Label>
              <Input
                type="number"
                step="0.01"
                value={silverRate}
                onChange={(e) => setSilverRate(e.target.value)}
                required
              />
            </div>

            <GoldButton type="submit" className="w-full py-2.5" disabled={updateRateMutation.isPending}>
              {updateRateMutation.isPending ? 'Updating...' : 'Publish Today Rate'}
            </GoldButton>
          </form>
        </Card>

        {/* History Table */}
        <Card className="lg:col-span-2 p-6">
          <CardHeader className="p-0 mb-4">
            <CardTitle>Rate History (Last 30 Days)</CardTitle>
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
                {rates.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="py-2.5 px-3 font-medium">{formatDate(r.date)}</td>
                    <td className="py-2.5 px-3 font-semibold text-amber-600 dark:text-amber-400">{formatINR(r.rate_22k)}</td>
                    <td className="py-2.5 px-3">{formatINR(r.rate_24k)}</td>
                    <td className="py-2.5 px-3">{formatINR(r.silver_rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
