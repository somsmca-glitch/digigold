import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Scheme } from '@/types/database'
import { Button } from '@/components/ui/button'
import { GoldButton } from '@/components/ui/gold-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatINR } from '@/lib/utils'
import {
  Sparkles, Gift, Calendar, ShieldCheck, TrendingUp, X, ArrowRight, Coins, Award, CheckCircle2
} from 'lucide-react'

interface SchemeEnrollmentModalProps {
  scheme: Scheme | null
  onClose: () => void
  onEnroll: (agreedAmount: number, dueDay: number) => Promise<void>
  isPending: boolean
}

export const SchemeEnrollmentModal: React.FC<SchemeEnrollmentModalProps> = ({
  scheme,
  onClose,
  onEnroll,
  isPending,
}) => {
  const [agreedAmount, setAgreedAmount] = useState<string>('')
  const [dueDay, setDueDay] = useState<number>(5)
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(true)

  useEffect(() => {
    if (scheme) {
      setAgreedAmount(scheme.min_installment ? scheme.min_installment.toString() : '1000')
      setDueDay(5)
      setAcceptedTerms(true)
    }
  }, [scheme])

  if (!scheme) return null

  const monthlyVal = parseFloat(agreedAmount) || scheme.min_installment || 1000
  const durationMonths = scheme.duration_months || 11
  const totalCustomerDeposit = monthlyVal * durationMonths
  const storeBonusValue = scheme.bonus_months > 0 ? monthlyVal * scheme.bonus_months : 0
  const estimatedTotalBenefit = totalCustomerDeposit + storeBonusValue

  // Estimated maturity date
  const today = new Date()
  const maturityDate = new Date(today)
  maturityDate.setMonth(maturityDate.getMonth() + durationMonths)
  const maturityMonthStr = maturityDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptedTerms) return
    onEnroll(monthlyVal, dueDay)
  }

  return (
    <AnimatePresence>
      {scheme && (
        <>
          {/* ── Dark Backdrop Overlay ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md z-[9998]"
          />

          {/* ── 80% Height Bottom Sheet (Slides Up From Bottom to Top) ── */}
          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 28,
              stiffness: 340,
              mass: 0.8,
            }}
            className="fixed bottom-0 left-0 right-0 max-w-lg w-full mx-auto h-[80vh] max-h-[82vh] rounded-t-[32px] sm:rounded-3xl bg-card border-t border-amber-500/40 shadow-2xl z-[9999] flex flex-col overflow-hidden"
          >
            {/* Top Drag Handle Bar */}
            <div
              className="pt-3 pb-1 flex justify-center shrink-0 cursor-grab active:cursor-grabbing"
              onClick={onClose}
            >
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30 hover:bg-amber-500/50 transition-colors" />
            </div>

            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-white shrink-0 shadow-md">
                  <Coins className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-extrabold text-foreground leading-tight truncate">
                    Enroll in {scheme.name}
                  </h2>
                  <p className="text-xs text-muted-foreground font-medium truncate">
                    {scheme.description || 'Flexible Monthly Gold Chit Plan'}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Scrollable Content Body (Hidden Scrollbars) */}
            <form
              onSubmit={handleSubmit}
              className="p-5 space-y-4 overflow-y-auto flex-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {/* Scheme Key Badges Row */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2.5 py-1">
                  <Calendar className="h-3 w-3 mr-1" /> {durationMonths} Months Duration
                </Badge>
                {scheme.bonus_months > 0 && (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-1">
                    <Sparkles className="h-3 w-3 mr-1" /> +{scheme.bonus_months} Month Free Bonus
                  </Badge>
                )}
                <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 text-[10px] font-bold px-2.5 py-1">
                  <Award className="h-3 w-3 mr-1" /> 100% BIS 916 Gold
                </Badge>
              </div>

              {/* Estimated Plan Value Summary Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-transparent border border-amber-500/35 space-y-3 relative overflow-hidden shadow-xs">
                <div className="flex justify-between items-center border-b border-amber-500/20 pb-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Plan Financial Benefits
                  </span>
                  <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                    Matures: {maturityMonthStr}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-left">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold">Your Total Deposit ({durationMonths} Mo)</p>
                    <p className="text-sm sm:text-base font-extrabold text-foreground">
                      {formatINR(totalCustomerDeposit)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Store Bonus Contribution</p>
                    <p className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                      +{formatINR(storeBonusValue)}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-500/20 flex justify-between items-center">
                  <span className="text-xs font-extrabold text-foreground">Total Maturity Benefit Value</span>
                  <span className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 font-mono">
                    {formatINR(estimatedTotalBenefit)}
                  </span>
                </div>

                {scheme.gift_description && (
                  <div className="rounded-xl bg-amber-500/15 border border-amber-500/30 p-2.5 text-xs text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-2">
                    <Gift className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>Included Reward: <strong>{scheme.gift_description}</strong></span>
                  </div>
                )}
              </div>

              {/* Monthly Installment Amount Selection */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Select Agreed Monthly Amount (₹)
                  </Label>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    Min: {formatINR(scheme.min_installment)}/mo
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-3 font-extrabold text-sm text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    min={scheme.min_installment}
                    step="500"
                    value={agreedAmount}
                    onChange={e => setAgreedAmount(e.target.value)}
                    placeholder={`Min ${scheme.min_installment}`}
                    className="pl-8 h-12 text-base font-extrabold text-foreground bg-background rounded-2xl border-amber-500/30 focus:border-amber-500 shadow-xs"
                    required
                  />
                </div>

                {/* Quick Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {[
                    scheme.min_installment,
                    2000,
                    3000,
                    5000,
                    10000,
                  ]
                    .filter((v, idx, self) => v && v >= scheme.min_installment && self.indexOf(v) === idx)
                    .map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAgreedAmount(amt.toString())}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          agreedAmount === amt.toString()
                            ? 'bg-amber-500 text-white border-amber-500 shadow-xs scale-105'
                            : 'bg-background border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        {formatINR(amt)}
                      </button>
                    ))}
                </div>
              </div>

              {/* Preferred Monthly Due Day Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Preferred Due Day of Each Month
                </Label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 5, 10, 15, 20].map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setDueDay(day)}
                      className={`py-2 rounded-xl text-xs font-bold border text-center transition-all ${
                        dueDay === day
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs ring-2 ring-amber-500/20'
                          : 'bg-background border-border/60 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Day {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Terms Acceptance Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-muted-foreground select-none">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={e => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border text-amber-500 focus:ring-amber-500"
                  />
                  <span>
                    I agree to pay the monthly installment of <strong>{formatINR(monthlyVal)}</strong> on or before Day {dueDay} for {durationMonths} months.
                  </span>
                </label>
              </div>

              {/* Bottom Sticky Submit Action - Centered */}
              <div className="pt-3 pb-[calc(16px+env(safe-area-inset-bottom,0px))] border-t border-border/50 shrink-0 flex flex-col items-center justify-center text-center px-4 bg-card/95">
                <GoldButton
                  type="submit"
                  disabled={isPending || !acceptedTerms || monthlyVal < scheme.min_installment}
                  className="w-full max-w-xs h-12 text-base font-extrabold gap-2 rounded-2xl shadow-xl justify-center mx-auto"
                >
                  <ShieldCheck className="h-5 w-5" />
                  {isPending ? 'Enrolling in Scheme...' : `Confirm & Enroll Now`}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </GoldButton>

                <p className="text-[10px] text-center text-muted-foreground font-semibold mt-2 flex items-center justify-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  100% Transparent Savings • Digital Passbook Generated Immediately
                </p>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
