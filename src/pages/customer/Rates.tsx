import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { GoldRate } from '@/types/database'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { GoldButton } from '@/components/ui/gold-button'
import { formatINR, formatDate } from '@/lib/utils'
import {
  Coins, Sparkles, TrendingUp, TrendingDown,
  LineChart as LineChartIcon, Target, Gift, ArrowRight, ShieldCheck, Zap
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Link } from 'react-router-dom'

type TargetMode = 'weight_target' | 'budget_target'

export const Rates: React.FC = () => {
  const [historyDays, setHistoryDays] = useState<30 | 60 | 90>(30)

  // Target Calculator State
  const [targetMode, setTargetMode] = useState<TargetMode>('weight_target')
  const [targetWeightGrams, setTargetWeightGrams] = useState('8')
  const [targetMonthlyBudget, setTargetMonthlyBudget] = useState('5000')

  // Fetch rates history up to 90 days
  const { data: rates = [] } = useQuery({
    queryKey: ['customer-rates-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gold_rates')
        .select('*')
        .order('date', { ascending: false })
        .limit(90)
      if (error) throw error
      return (data as GoldRate[]) ?? []
    },
  })

  const todayRate = rates[0] ?? null
  const prevRate = rates[1] ?? null

  const rate22k = todayRate?.rate_22k ?? 6850
  const rate24k = todayRate?.rate_24k ?? null
  const rateSilver = todayRate?.silver_rate ?? null

  const prev22k = prevRate?.rate_22k ?? null
  const prev24k = prevRate?.rate_24k ?? null
  const prevSilver = prevRate?.silver_rate ?? null

  const diff22k = rate22k && prev22k ? rate22k - prev22k : null
  const diff24k = rate24k && prev24k ? rate24k - prev24k : null
  const diffSilver = rateSilver && prevSilver ? rateSilver - prevSilver : null

  const pct22k = diff22k && prev22k ? (diff22k / prev22k) * 100 : 0
  const pct24k = diff24k && prev24k ? (diff24k / prev24k) * 100 : 0
  const pctSilver = diffSilver && prevSilver ? (diffSilver / prevSilver) * 100 : 0

  // ── Smart Data Sampling (30D = Daily, 60D = Weekly, 90D = Monthly) ──
  const getAggregatedChartData = () => {
    const raw = rates.slice(0, historyDays).reverse()
    if (raw.length === 0) return []

    if (historyDays === 30) {
      // 30 Days -> Show Daily values (all daily rate points)
      return raw
    }

    if (historyDays === 60) {
      // 60 Days -> Show Weekly values (1 sample every 7 days)
      const weeklySamples: typeof raw = []
      for (let i = 0; i < raw.length; i += 7) {
        weeklySamples.push(raw[i])
      }
      if (raw.length > 0 && weeklySamples[weeklySamples.length - 1]?.id !== raw[raw.length - 1]?.id) {
        weeklySamples.push(raw[raw.length - 1])
      }
      return weeklySamples
    }

    // 90 Days -> Show Monthly values (1 sample per calendar month)
    const monthlySamples: typeof raw = []
    const monthSeen = new Set<string>()
    for (let i = 0; i < raw.length; i++) {
      const monthKey = raw[i].date.slice(0, 7) // "YYYY-MM"
      if (!monthSeen.has(monthKey)) {
        monthSeen.add(monthKey)
        monthlySamples.push(raw[i])
      }
    }
    if (raw.length > 0 && monthlySamples[monthlySamples.length - 1]?.id !== raw[raw.length - 1]?.id) {
      monthlySamples.push(raw[raw.length - 1])
    }
    return monthlySamples
  }

  const chartData = getAggregatedChartData()

  // ── Target Calculator Computations ───────────────────────────
  let calculatedMonthlyInstallment = 0
  let calculatedTotalWeightGrams = 0
  let calculatedCustomerPaid = 0
  let calculatedFreeBonusAmount = 0
  let calculatedMaturityTotalValue = 0

  if (targetMode === 'weight_target') {
    const targetGrams = parseFloat(targetWeightGrams) || 8
    calculatedTotalWeightGrams = targetGrams
    calculatedMaturityTotalValue = targetGrams * rate22k
    calculatedMonthlyInstallment = Math.ceil(calculatedMaturityTotalValue / 12)
    calculatedCustomerPaid = calculatedMonthlyInstallment * 11
    calculatedFreeBonusAmount = calculatedMonthlyInstallment
  } else {
    const monthlyBudget = parseFloat(targetMonthlyBudget) || 5000
    calculatedMonthlyInstallment = monthlyBudget
    calculatedCustomerPaid = monthlyBudget * 11
    calculatedFreeBonusAmount = monthlyBudget
    calculatedMaturityTotalValue = monthlyBudget * 12
    calculatedTotalWeightGrams = rate22k > 0 ? calculatedMaturityTotalValue / rate22k : 0
  }

  const sovereignsCount = (calculatedTotalWeightGrams / 8).toFixed(2)

  return (
    <div className="space-y-2.5 max-w-4xl mx-auto pb-2">
      {/* ── Page Header (Compact Single View Header) ────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-base sm:text-lg font-black tracking-tight text-foreground leading-tight">
            Daily Gold Rates &amp; Target Calculator
          </h1>
          <p className="text-[10px] text-muted-foreground">
            Live benchmark prices &amp; target savings calculator
          </p>
        </div>

        {todayRate && (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[9.5px] font-bold py-0.5 px-2">
            Updated: {formatDate(todayRate.date)}
          </Badge>
        )}
      </div>

      {/* ── Single Row 3-Card Grid (22K, 24K & Silver) ────────────── */}
      <div className="grid grid-cols-3 gap-2">
        {/* 22K Card */}
        <Card className="p-2 border-amber-500/40 bg-gradient-to-br from-amber-500/15 via-yellow-500/5 to-transparent relative overflow-hidden shadow-xs flex flex-col items-center justify-center text-center">
          <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400 w-full text-center">
            <span className="text-[9.5px] sm:text-xs font-black uppercase tracking-wider truncate">22K Gold</span>
            <Sparkles className="h-2.5 w-2.5 shrink-0 hidden sm:block" />
          </div>

          <div className="mt-0.5 flex flex-col items-center justify-center text-center w-full">
            <div className="flex items-center justify-center gap-0.5 text-xs sm:text-base font-black text-amber-600 dark:text-amber-400 leading-none text-center w-full mx-auto font-mono">
              <span>{rate22k ? formatINR(rate22k) : '—'}</span>
              <span className="text-[8.5px] text-muted-foreground font-semibold">/g</span>
            </div>

            {diff22k !== null ? (
              <div className={`flex items-center justify-center gap-0.5 text-[8.5px] font-bold mt-0.5 ${diff22k > 0 ? 'text-emerald-500' : diff22k < 0 ? 'text-rose-500' : 'text-muted-foreground'
                }`}>
                {diff22k > 0 ? <TrendingUp className="h-2.5 w-2.5 shrink-0" /> : diff22k < 0 ? <TrendingDown className="h-2.5 w-2.5 shrink-0" /> : null}
                <span>{diff22k > 0 ? `+₹${diff22k}` : diff22k < 0 ? `-₹${Math.abs(diff22k)}` : 'Same'}</span>
              </div>
            ) : (
              <p className="text-[8.5px] text-muted-foreground mt-0.5 text-center">BIS 916</p>
            )}
          </div>
        </Card>

        {/* 24K Card */}
        <Card className="p-2 border-yellow-500/40 bg-gradient-to-br from-yellow-500/15 via-amber-600/5 to-transparent relative overflow-hidden shadow-xs flex flex-col items-center justify-center text-center">
          <div className="flex items-center justify-center gap-1 text-yellow-600 dark:text-yellow-400 w-full text-center">
            <span className="text-[9.5px] sm:text-xs font-black uppercase tracking-wider truncate">24K Bullion</span>
            <Coins className="h-2.5 w-2.5 shrink-0 hidden sm:block" />
          </div>

          <div className="mt-0.5 flex flex-col items-center justify-center text-center w-full">
            <div className="flex items-center justify-center gap-0.5 text-xs sm:text-base font-black text-yellow-600 dark:text-yellow-400 leading-none text-center w-full mx-auto font-mono">
              <span>{rate24k ? formatINR(rate24k) : '—'}</span>
              <span className="text-[8.5px] text-muted-foreground font-semibold">/g</span>
            </div>

            {diff24k !== null ? (
              <div className={`flex items-center justify-center gap-0.5 text-[8.5px] font-bold mt-0.5 ${diff24k > 0 ? 'text-emerald-500' : diff24k < 0 ? 'text-rose-500' : 'text-muted-foreground'
                }`}>
                {diff24k > 0 ? <TrendingUp className="h-2.5 w-2.5 shrink-0" /> : diff24k < 0 ? <TrendingDown className="h-2.5 w-2.5 shrink-0" /> : null}
                <span>{diff24k > 0 ? `+₹${diff24k}` : diff24k < 0 ? `-₹${Math.abs(diff24k)}` : 'Same'}</span>
              </div>
            ) : (
              <p className="text-[8.5px] text-muted-foreground mt-0.5 text-center">99.9% Pure</p>
            )}
          </div>
        </Card>

        {/* Silver Card */}
        <Card className="p-2 border-slate-400/30 bg-gradient-to-br from-slate-500/10 to-transparent relative overflow-hidden shadow-xs flex flex-col items-center justify-center text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground w-full text-center">
            <span className="text-[9.5px] sm:text-xs font-black uppercase tracking-wider truncate">Fine Silver</span>
            <Coins className="h-2.5 w-2.5 shrink-0 hidden sm:block" />
          </div>

          <div className="mt-0.5 flex flex-col items-center justify-center text-center w-full">
            <div className="flex items-center justify-center gap-0.5 text-xs sm:text-base font-black text-foreground leading-none text-center w-full mx-auto font-mono">
              <span>{rateSilver ? formatINR(rateSilver) : '—'}</span>
              <span className="text-[8.5px] text-muted-foreground font-semibold">/g</span>
            </div>

            {diffSilver !== null ? (
              <div className={`flex items-center justify-center gap-0.5 text-[8.5px] font-bold mt-0.5 ${diffSilver > 0 ? 'text-emerald-500' : diffSilver < 0 ? 'text-rose-500' : 'text-muted-foreground'
                }`}>
                {diffSilver > 0 ? <TrendingUp className="h-2.5 w-2.5 shrink-0" /> : diffSilver < 0 ? <TrendingDown className="h-2.5 w-2.5 shrink-0" /> : null}
                <span>{diffSilver > 0 ? `+₹${diffSilver}` : diffSilver < 0 ? `-₹${Math.abs(diffSilver)}` : 'Same'}</span>
              </div>
            ) : (
              <p className="text-[8.5px] text-muted-foreground mt-0.5 text-center">999 Silver</p>
            )}
          </div>
        </Card>
      </div>

      {/* ── Compact Interactive Trend Chart ────────────────── */}
      <Card className="p-2.5 border-amber-500/25 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <LineChartIcon className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <h3 className="font-heading font-black text-xs text-foreground">Gold Price History</h3>
          </div>

          <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/50">
            {[
              { d: 30, label: '30D' },
              { d: 60, label: '60D' },
              { d: 90, label: '90D' },
            ].map(item => (
              <button
                key={item.d}
                onClick={() => setHistoryDays(item.d as any)}
                className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold transition-all cursor-pointer ${historyDays === item.d
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="h-45 flex items-center justify-center text-[10px] text-muted-foreground">
            No historical gold rates recorded yet.
          </div>
        ) : (
          <div className="h-45 sm:h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  dataKey="date"
                  tickFormatter={str => formatDate(str)}
                  tick={{ fontSize: 8, fill: '#888' }}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tickFormatter={val => `₹${val}`}
                  tick={{ fontSize: 8, fill: '#888' }}
                />
                <Tooltip
                  formatter={(value: any) => [`${formatINR(Number(value))}/g`, '22K Gold']}
                  labelFormatter={(label) => formatDate(label as string)}
                  contentStyle={{ backgroundColor: 'rgba(20, 20, 20, 0.95)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.3)', color: '#fff', fontSize: '10px' }}
                />
                <Line
                  type="monotone"
                  dataKey="rate_22k"
                  name="22K Rate"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="rate_24k"
                  name="24K Rate"
                  stroke="#eab308"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* ── 🎯 Target Gold Savings Calculator (Single View Compact Layout) ── */}
      <Card className="p-3 border-amber-500/35 overflow-hidden relative shadow-md bg-gradient-to-br from-card via-amber-500/5 to-card rounded-xl">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2 border-b border-border/60 pb-2">
          <div className="h-7 w-7 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shadow-xs shrink-0">
            <Target className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="font-heading font-black text-xs sm:text-sm text-foreground tracking-tight">
              Gold Savings Target Calculator
            </h3>
            <p className="text-[9.5px] text-muted-foreground">
              Calculate installment &amp; free 1-month store bonus from live 22K rate ({formatINR(rate22k)}/g)
            </p>
          </div>
        </div>

        {/* 2-Target Mode Switcher Pills */}
        <div className="grid grid-cols-2 gap-1 mb-2.5 p-0.5 bg-muted/60 rounded-lg border border-border/60">
          <button
            onClick={() => setTargetMode('weight_target')}
            className={`py-1 px-2 rounded-md text-[10.5px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${targetMode === 'weight_target'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <Coins className="h-3 w-3" />
            <span>Target Weight (Grams/Sov)</span>
          </button>

          <button
            onClick={() => setTargetMode('budget_target')}
            className={`py-1 px-2 rounded-md text-[10.5px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${targetMode === 'budget_target'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <Target className="h-3 w-3" />
            <span>Target Monthly Budget (₹)</span>
          </button>
        </div>

        {/* Target Slider & Quick Selection Controls */}
        <div className="space-y-2.5">
          {targetMode === 'weight_target' ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[9.5px] font-black text-muted-foreground uppercase tracking-wider">
                  Target Weight Goal
                </label>
                <div className="text-right">
                  <span className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 font-mono">
                    {targetWeightGrams} Grams
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground ml-1 font-mono">
                    ({sovereignsCount} Sov)
                  </span>
                </div>
              </div>

              <input
                type="range"
                min="2"
                max="64"
                step="1"
                value={targetWeightGrams}
                onChange={e => setTargetWeightGrams(e.target.value)}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-muted rounded-lg"
              />

              <div className="flex flex-wrap gap-1">
                {[
                  { label: '4g (1/2 Sov)', val: '4' },
                  { label: '8g (1 Sov)', val: '8' },
                  { label: '16g (2 Sovs)', val: '16' },
                  { label: '24g (3 Sovs)', val: '24' },
                  { label: '32g (4 Sovs)', val: '32' },
                ].map(item => (
                  <button
                    key={item.val}
                    onClick={() => setTargetWeightGrams(item.val)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${targetWeightGrams === item.val
                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                      : 'border-border/70 text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[9.5px] font-black text-muted-foreground uppercase tracking-wider">
                  Monthly Target Investment
                </label>
                <span className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 font-mono">
                  {formatINR(calculatedMonthlyInstallment)} <span className="text-[10px] font-normal text-muted-foreground">/mo</span>
                </span>
              </div>

              <input
                type="range"
                min="1000"
                max="50000"
                step="500"
                value={targetMonthlyBudget}
                onChange={e => setTargetMonthlyBudget(e.target.value)}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-muted rounded-lg"
              />

              <div className="flex flex-wrap gap-1">
                {['1000', '2500', '5000', '10000', '25000'].map(val => (
                  <button
                    key={val}
                    onClick={() => setTargetMonthlyBudget(val)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${targetMonthlyBudget === val
                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                      : 'border-border/70 text-muted-foreground hover:text-foreground'
                      }`}
                  >
                    {formatINR(Number(val))}/mo
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 📊 Target Breakdown Summary Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 p-2 rounded-xl bg-amber-500/10 dark:bg-amber-950/25 border border-amber-500/25 my-1">
            {/* 1. Monthly Installment */}
            <div className="space-y-0.5">
              <p className="text-[8.5px] font-black uppercase text-muted-foreground tracking-widest">REQUIRED MONTHLY</p>
              <p className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-300 font-mono">
                {formatINR(calculatedMonthlyInstallment)}
              </p>
              <p className="text-[8.5px] text-muted-foreground font-semibold">11 Dues to Pay</p>
            </div>

            {/* 2. Total You Invest */}
            <div className="space-y-0.5">
              <p className="text-[8.5px] font-black uppercase text-muted-foreground tracking-widest">TOTAL YOU INVEST</p>
              <p className="text-xs sm:text-sm font-black text-foreground font-mono">
                {formatINR(calculatedCustomerPaid)}
              </p>
              <p className="text-[8.5px] text-muted-foreground font-semibold">Over 11 Months</p>
            </div>

            {/* 3. Free Store Bonus */}
            <div className="space-y-0.5">
              <p className="text-[8.5px] font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1 tracking-widest">
                <Gift className="h-2.5 w-2.5" /> STORE BONUS
              </p>
              <p className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                +{formatINR(calculatedFreeBonusAmount)}
              </p>
              <p className="text-[8.5px] text-emerald-600/80 dark:text-emerald-400/80 font-bold">12th Month 100% Free</p>
            </div>

            {/* 4. Target Gold Accumulated */}
            <div className="space-y-0.5">
              <p className="text-[8.5px] font-black uppercase text-muted-foreground tracking-widest">TOTAL ACCUMULATED</p>
              <p className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-300 font-mono">
                {calculatedTotalWeightGrams.toFixed(3)} g
              </p>
              <p className="text-[8.5px] text-emerald-600 dark:text-emerald-400 font-bold">
                ≈ {sovereignsCount} Sov ({formatINR(calculatedMaturityTotalValue)})
              </p>
            </div>
          </div>

          {/* Direct CTA Action Button */}
          <div className="flex justify-end pt-0.5">
            <Link to="/customer/schemes">
              <GoldButton className="h-7.5 px-3 text-[11px] font-black rounded-lg shadow-md shadow-amber-500/20 gap-1.5">
                <Zap className="h-3 w-3 fill-current" /> Start Target Scheme <ArrowRight className="h-3 w-3" />
              </GoldButton>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
