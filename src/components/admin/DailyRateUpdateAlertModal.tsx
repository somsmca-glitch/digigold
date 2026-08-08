import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { GoldRate } from '@/types/database'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatINR } from '@/lib/utils'
import {
  Clock, Sparkles, Coins, TrendingUp, TrendingDown,
  Save, X, BellRing, CheckCircle2, AlertTriangle, Sun, Moon, ArrowRight
} from 'lucide-react'

export const DailyRateUpdateAlertModal: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [shiftName, setShiftName] = useState<'morning' | 'evening' | 'custom'>('morning')

  // Rates State
  const [rate22k, setRate22k] = useState('')
  const [rate24k, setRate24k] = useState('')
  const [rateSilver, setRateSilver] = useState('')
  const [lastRateRecord, setLastRateRecord] = useState<GoldRate | null>(null)
  const [saving, setSaving] = useState(false)

  // ── 🕒 Smart Time Window Evaluation (10-11 AM & 5-6 PM) ──────────
  useEffect(() => {
    const checkRateUpdateSchedule = async () => {
      const now = new Date()
      const hours = now.getHours()
      const todayStr = now.toISOString().slice(0, 10) // "YYYY-MM-DD"

      // Check if current time falls in shift windows:
      // Morning: 10 AM to 11 AM (10:00 - 10:59)
      // Evening: 5 PM to 6 PM (17:00 - 17:59)
      const isMorningShift = hours >= 10 && hours < 11
      const isEveningShift = hours >= 17 && hours < 18

      if (!isMorningShift && !isEveningShift) {
        return // Outside alert windows
      }

      const currentShift = isMorningShift ? 'morning' : 'evening'
      setShiftName(currentShift)

      // Check local snooze key for current shift
      const snoozeKey = `rate_alert_dismissed_${todayStr}_${currentShift}`
      const isSnoozed = localStorage.getItem(snoozeKey)
      if (isSnoozed) return

      // Fetch latest rates from Supabase DB to check if today's shift rates were already updated
      try {
        const { data, error } = await supabase
          .from('gold_rates')
          .select('*')
          .order('date', { ascending: false })
          .limit(1)

        if (error) {
          console.warn('Rate alert DB check notice:', error.message)
          return
        }

        const latestRecord = (data?.[0] as GoldRate) ?? null
        setLastRateRecord(latestRecord)

        // If latest rate record date matches today AND updated in current shift, don't show pop-up
        if (latestRecord) {
          const isTodayRecord = latestRecord.date === todayStr
          if (isTodayRecord) {
            const recordTime = new Date(latestRecord.updated_at || latestRecord.created_at)
            const recordHour = recordTime.getHours()

            if (isMorningShift && recordHour >= 10 && recordHour < 11) return
            if (isEveningShift && recordHour >= 17 && recordHour < 18) return
          }

          // Pre-fill input with latest rate values as starting point
          setRate22k(latestRecord.rate_22k?.toString() || '6850')
          setRate24k(latestRecord.rate_24k?.toString() || '7470')
          setRateSilver(latestRecord.silver_rate?.toString() || '92')
        } else {
          // Defaults if no DB record yet
          setRate22k('6850')
          setRate24k('7470')
          setRateSilver('92')
        }

        // Show Pop-up Dialog!
        setOpen(true)
      } catch (err) {
        console.error('Failed to check rate schedule:', err)
      }
    }

    checkRateUpdateSchedule()
    // Periodic re-check every 5 minutes while admin panel is open
    const interval = setInterval(checkRateUpdateSchedule, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Listen for manual trigger event (e.g. from Admin Rates Page button)
  useEffect(() => {
    const handleManualTrigger = () => {
      const now = new Date()
      const hours = now.getHours()
      setShiftName(hours >= 16 ? 'evening' : 'morning')
      setOpen(true)
    }
    window.addEventListener('trigger-rate-update-dialog', handleManualTrigger)
    return () => window.removeEventListener('trigger-rate-update-dialog', handleManualTrigger)
  }, [])

  // Snooze / Dismiss for 15 minutes
  const handleSnooze = () => {
    const todayStr = new Date().toISOString().slice(0, 10)
    localStorage.setItem(`rate_alert_dismissed_${todayStr}_${shiftName}`, 'snoozed')
    setOpen(false)
    toast.info('⏱️ Rate update reminder snoozed for 15 minutes')
  }

  // Handle Save & Publish New Daily Rates
  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault()

    const num22k = parseFloat(rate22k)
    const num24k = parseFloat(rate24k)
    const numSilver = parseFloat(rateSilver)

    if (!num22k || num22k <= 0) {
      toast.error('Please enter a valid 22K Gold Rate')
      return
    }
    if (!num24k || num24k <= 0) {
      toast.error('Please enter a valid 24K Bullion Rate')
      return
    }

    try {
      setSaving(true)
      const todayStr = new Date().toISOString().slice(0, 10)

      // Insert or Update today's rate record in Supabase DB `gold_rates`
      const { error } = await supabase
        .from('gold_rates')
        .upsert(
          {
            date: todayStr,
            rate_22k: num22k,
            rate_24k: num24k,
            rate_18k: Math.round(num22k * 0.82), // Auto-calculate 18K
            silver_rate: numSilver || 92,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: 'date' }
        )

      if (error) throw error

      // Mark current shift as updated in localStorage
      localStorage.setItem(`rate_alert_dismissed_${todayStr}_${shiftName}`, 'completed')

      toast.success(`🎉 ${shiftName.toUpperCase()} Shift Rates Published Successfully!`)
      setOpen(false)

      // Reload window/queries to sync across dashboard
      window.dispatchEvent(new Event('gold-rates-updated'))
    } catch (err: any) {
      toast.error(err.message || 'Failed to save daily rates')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const prev22k = lastRateRecord?.rate_22k ?? 6850
  const current22kNum = parseFloat(rate22k) || prev22k
  const diff22k = current22kNum - prev22k

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="w-full max-w-md"
        >
          <Card className="overflow-hidden border-2 border-amber-500/50 shadow-2xl bg-card rounded-3xl">
            {/* ── Top Metallic Gold Header Strip ───────────────────────────── */}
            <div className="relative p-4 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-500 text-slate-950 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-slate-950/30 backdrop-blur-md border border-white/30 flex items-center justify-center text-amber-300 shrink-0 shadow-lg">
                  <BellRing className="h-5 w-5 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <Badge className="bg-slate-950 text-amber-400 font-black text-[9.5px] uppercase tracking-wider px-2 py-0.5 border border-amber-400/40">
                      {shiftName === 'morning' ? (
                        <span className="flex items-center gap-1">
                          <Sun className="h-3 w-3 text-yellow-400" /> Morning Shift (10 AM - 11 AM)
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Moon className="h-3 w-3 text-amber-300" /> Evening Shift (5 PM - 6 PM)
                        </span>
                      )}
                    </Badge>
                  </div>
                  <h3 className="font-heading font-black text-base sm:text-lg text-slate-950 tracking-tight leading-tight mt-1">
                    Daily Rates Update Required!
                  </h3>
                </div>
              </div>

              <button
                onClick={handleSnooze}
                className="h-7 w-7 rounded-full bg-slate-950/20 hover:bg-slate-950/40 text-slate-950 flex items-center justify-center transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ── Form Content Body ───────────────────────────────────────── */}
            <form onSubmit={handleSaveRates} className="p-4 sm:p-5 space-y-4">
              <p className="text-xs text-muted-foreground font-medium">
                Please enter today's benchmark market gold &amp; silver rates to update live customer scheme calculators.
              </p>

              {/* 3 Rate Input Grid */}
              <div className="space-y-3">
                {/* 1. 22K Gold Rate */}
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-black uppercase text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" /> 22K Gold Rate (₹ / Gram)
                    </Label>

                    {diff22k !== 0 && (
                      <span className={`text-[10.5px] font-mono font-black flex items-center gap-0.5 ${
                        diff22k > 0 ? 'text-emerald-500' : 'text-rose-500'
                      }`}>
                        {diff22k > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {diff22k > 0 ? `+₹${diff22k}` : `-₹${Math.abs(diff22k)}`}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm font-black text-amber-600 dark:text-amber-400 font-mono">₹</span>
                    <Input
                      type="number"
                      step="1"
                      value={rate22k}
                      onChange={e => setRate22k(e.target.value)}
                      placeholder="e.g. 6850"
                      className="pl-7 h-10 text-sm font-black font-mono bg-background border-amber-500/40 rounded-xl focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                </div>

                {/* 2. 24K Gold Rate & Silver Rate in 2 Columns */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* 24K Bullion */}
                  <div className="space-y-1 p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                      <Coins className="h-3 w-3 text-yellow-500" /> 24K Bullion (₹/g)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs font-bold text-muted-foreground font-mono">₹</span>
                      <Input
                        type="number"
                        step="1"
                        value={rate24k}
                        onChange={e => setRate24k(e.target.value)}
                        placeholder="7470"
                        className="pl-6 h-8.5 text-xs font-bold font-mono bg-background rounded-lg"
                        required
                      />
                    </div>
                  </div>

                  {/* Silver Rate */}
                  <div className="space-y-1 p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1">
                      <Coins className="h-3 w-3 text-slate-400" /> Fine Silver (₹/g)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs font-bold text-muted-foreground font-mono">₹</span>
                      <Input
                        type="number"
                        step="0.5"
                        value={rateSilver}
                        onChange={e => setRateSilver(e.target.value)}
                        placeholder="92"
                        className="pl-6 h-8.5 text-xs font-bold font-mono bg-background rounded-lg"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full h-10.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 gap-2 cursor-pointer"
                >
                  <Save className="h-4 w-4" /> Save &amp; Publish Daily Rates <ArrowRight className="h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSnooze}
                  className="w-full h-8 text-xs font-bold text-muted-foreground hover:text-foreground rounded-xl"
                >
                  ⏱️ Remind Me Later (15 Mins)
                </Button>
              </div>
            </form>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
