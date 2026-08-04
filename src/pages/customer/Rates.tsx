import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { GoldRate } from '@/types/database'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatINR, formatDate } from '@/lib/utils'
import { Coins, Sparkles, Calculator } from 'lucide-react'

export const Rates: React.FC = () => {
  const [grams, setGrams] = useState('8') // default 1 sovereign (8g)

  const { data: todayRate } = useQuery({
    queryKey: ['live-gold-rate'],
    queryFn: async () => {
      const todayStr = new Date().toISOString().split('T')[0]
      const { data } = await supabase.from('gold_rates').select('*').order('date', { ascending: false }).limit(1).maybeSingle()
      return data as GoldRate | null
    },
  })

  const rate22k = todayRate?.rate_22k ?? null
  const rate24k = todayRate?.rate_24k ?? null
  const rateSilver = todayRate?.silver_rate ?? null

  const weightNum = parseFloat(grams) || 0
  const calc22k = rate22k ? weightNum * rate22k : 0
  const calc24k = rate24k ? weightNum * rate24k : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Gold & Silver Rates</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Live market rates updated daily</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-yellow-500/10">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-xs font-bold uppercase tracking-wider">22K Gold (Ornament)</span>
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-2">
            {rate22k ? `${formatINR(rate22k)}/g` : 'Not Set'}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Standard jewelry purity</p>
        </Card>

        <Card className="p-5 border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 to-amber-600/10">
          <div className="flex items-center justify-between text-yellow-600 dark:text-yellow-400">
            <span className="text-xs font-bold uppercase tracking-wider">24K Gold (Bullion)</span>
            <Coins className="h-5 w-5" />
          </div>
          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
            {rate24k ? `${formatINR(rate24k)}/g` : 'Not Set'}
          </div>
          <p className="text-xs text-muted-foreground mt-1">99.9% Pure fine gold</p>
        </Card>

        <Card className="p-5 border-slate-400/40">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase tracking-wider">Silver Rate</span>
            <Coins className="h-5 w-5" />
          </div>
          <div className="text-3xl font-bold text-foreground mt-2">
            {rateSilver ? `${formatINR(rateSilver)}/g` : 'Not Set'}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Fine silver per gram</p>
        </Card>
      </div>

      {/* Gold Calculator */}
      <Card className="p-6">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-5 w-5 text-amber-500" /> Gold Value Estimator
          </CardTitle>
        </CardHeader>

        <div className="space-y-4">
          <div className="space-y-2 max-w-xs">
            <Label>Weight in Grams (g)</Label>
            <Input
              type="number"
              step="0.1"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
            <div>
              <span className="text-xs text-muted-foreground block">Estimated 22K Value</span>
              <span className="text-xl font-bold text-amber-600 dark:text-amber-400">{formatINR(calc22k)}</span>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Estimated 24K Value</span>
              <span className="text-xl font-bold text-foreground">{formatINR(calc24k)}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
