import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { GoldRate, CustomerChit, Scheme, Payment, PromoBanner } from '@/types/database'
import { GlassCard } from '@/components/ui/glass-card'
import { Card } from '@/components/ui/card'
import { GoldButton } from '@/components/ui/gold-button'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { formatINR, formatDate } from '@/lib/utils'
import { SchemePaymentModal } from '@/components/customer/SchemePaymentModal'
import {
  Sparkles,
  Layers,
  Coins,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Calculator,
  Target,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Calendar,
  Award,
  Wallet,
  CheckCircle2,
  Gift,
  Check,
  PartyPopper,
  Crown,
  X,
  CreditCard,
  AlertTriangle,
} from 'lucide-react'

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.38, ease: 'easeOut' },
  }),
}

const slideAnimationVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 1.08,
    filter: 'blur(4px)',
  }),
  center: {
    x: '0%',
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
  },
  exit: (dir: number) => ({
    x: dir < 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.94,
    filter: 'blur(4px)',
  }),
}

type CalcMode = 'amount' | 'weight'

export const CustomerDashboard: React.FC = () => {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()

  // Active Chit ATM Card State & Payment Modal State
  const [selectedChitIndex, setSelectedChitIndex] = useState(0)
  const [cardDirection, setCardDirection] = useState(0)
  const [selectedChitForPayment, setSelectedChitForPayment] = useState<any | null>(null)

  // Quick Self-Enrollment State
  const [selectedSchemeForEnroll, setSelectedSchemeForEnroll] = useState<Scheme | null>(null)
  const [enrollMonthlyAmount, setEnrollMonthlyAmount] = useState<string>('5000')
  const [enrollDueDay, setEnrollDueDay] = useState<string>('10')

  const selfEnrollMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSchemeForEnroll || !user) throw new Error('Scheme or user invalid')
      const today = new Date()
      const startDateStr = today.toISOString().split('T')[0]
      const maturity = new Date(today)
      maturity.setMonth(maturity.getMonth() + (selectedSchemeForEnroll.duration_months || 11))

      const agreedAmt = parseFloat(enrollMonthlyAmount) || selectedSchemeForEnroll.min_installment

      const { data, error } = await supabase
        .from('customer_chits')
        .insert({
          customer_id: user.id,
          scheme_id: selectedSchemeForEnroll.id,
          start_date: startDateStr,
          maturity_date: maturity.toISOString().split('T')[0],
          monthly_due_day: parseInt(enrollDueDay),
          agreed_amount: agreedAmt,
          status: 'active',
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('🎉 Scheme Enrolled Successfully!')
      queryClient.invalidateQueries({ queryKey: ['my-chits-full-resilient'] })
      queryClient.invalidateQueries({ queryKey: ['my-chits-full'] })
      queryClient.invalidateQueries({ queryKey: ['my-chits'] })
      setSelectedSchemeForEnroll(null)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Enrollment failed')
    },
  })

  // ── Fetch real customer record from Supabase DB ────────────
  const { data: customerRecord } = useQuery({
    queryKey: ['customer-db-record-welcome', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle()
      return data
    },
    enabled: !!user?.id,
  })

  const customerDisplayName = customerRecord?.name || profile?.full_name || user?.user_metadata?.full_name || 'Valued Customer'

  // ── Fetch Active Promo Banners for Carousel ────────────────
  const { data: promoBanners = [] } = useQuery<PromoBanner[]>({
    queryKey: ['customer-promo-banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_banners')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error) {
        console.warn('promo_banners query fallback:', error.message)
        return []
      }
      return (data as PromoBanner[]) ?? []
    },
  })

  const activeSliders = promoBanners
  const [currentSlide, setCurrentSlide] = useState(0)
  const [slideDirection, setSlideDirection] = useState<number>(1)

  const handleNextSlide = () => {
    setSlideDirection(1)
    setCurrentSlide((prev) => (prev + 1) % (activeSliders.length || 1))
  }

  const handlePrevSlide = () => {
    setSlideDirection(-1)
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : (activeSliders.length || 1) - 1))
  }

  const handleSelectSlide = (idx: number) => {
    setSlideDirection(idx > currentSlide ? 1 : -1)
    setCurrentSlide(idx)
  }

  useEffect(() => {
    if (activeSliders.length <= 1) return
    const interval = setInterval(() => {
      handleNextSlide()
    }, 4500)
    return () => clearInterval(interval)
  }, [activeSliders.length])

  // ── Fetch available chit schemes ─────────────────────────────
  const { data: availableSchemes = [] } = useQuery<Scheme[]>({
    queryKey: ['available-schemes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chit_schemes').select('*')
      if (error) throw error
      return (data as Scheme[]) ?? []
    },
  })

  // ── Fetch last 2 gold rates for comparison ──────────────────
  const { data: rates = [] } = useQuery({
    queryKey: ['gold-rates-compare'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gold_rates')
        .select('*')
        .order('date', { ascending: false })
        .limit(2)
      return (data ?? []) as GoldRate[]
    },
  })

  const todayRate = rates[0] ?? null
  const yesterdayRate = rates[1] ?? null

  const rate22k = todayRate?.rate_22k ?? null
  const prev22k = yesterdayRate?.rate_22k ?? null
  const delta22k = rate22k && prev22k ? rate22k - prev22k : null
  const deltaPercent22k = rate22k && prev22k && prev22k !== 0
    ? ((rate22k - prev22k) / prev22k) * 100
    : null

  // ── Fetch user chits with complete payments (Resilient & Accurate) ──
  const { data: customerChits = [] } = useQuery({
    queryKey: ['my-chits-full-resilient', user?.id],
    queryFn: async () => {
      // 1. Fetch customer chits
      const { data: chitsData, error: chitsError } = await supabase
        .from('customer_chits')
        .select('*, scheme:chit_schemes(*), payments(*)')
        .eq('customer_id', user!.id)
        .order('created_at', { ascending: false })

      // 2. Fetch all payments for this customer for resilient fallback mapping
      const { data: userPayments } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', user!.id)

      const paymentsByChit = new Map<string, Payment[]>()
      ;(userPayments || []).forEach((p: any) => {
        const chitKey = p.customer_chit_id || p.chit_id
        if (chitKey) {
          const list = paymentsByChit.get(chitKey) || []
          list.push(p)
          paymentsByChit.set(chitKey, list)
        }
      })

      return ((chitsData || []) as any[]).map((c: any) => {
        const embeddedPayments = Array.isArray(c.payments) ? c.payments : []
        const fallbackPayments = paymentsByChit.get(c.id) || []
        const mergedPayments = embeddedPayments.length >= fallbackPayments.length ? embeddedPayments : fallbackPayments

        return {
          ...c,
          payments: mergedPayments,
        }
      }) as (CustomerChit & { scheme?: Scheme; payments?: Payment[] })[]
    },
    enabled: !!user?.id,
  })

  const activeChits = customerChits.filter(c => c.status === 'active')

  // Calculate totals
  let totalMoneyInvested = 0
  let totalGoldGramsSaved = 0

  customerChits.forEach(chit => {
    (chit.payments || []).forEach(p => {
      totalMoneyInvested += p.amount || 0
      if (p.gold_weight_grams) {
        totalGoldGramsSaved += p.gold_weight_grams
      } else if (rate22k && rate22k > 0) {
        totalGoldGramsSaved += (p.amount || 0) / rate22k
      }
    })
  })





  return (
    <div className="space-y-6 pb-6">
      {/* ── Welcome Hero Ultra-Sleek Elegant Jewel Banner ───────────── */}
      <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-950 via-pink-900 to-amber-950 border border-rose-500/30 px-4 py-3 sm:px-5 sm:py-3.5 text-white shadow-xl shadow-rose-950/30">
          <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-rose-500/20 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-amber-500/15 blur-xl pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[size:16px_16px] pointer-events-none opacity-25" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 backdrop-blur-md border border-rose-400/30 text-[10px] font-black uppercase tracking-widest text-rose-200">
                  <Sparkles className="h-2.5 w-2.5 text-amber-300" /> Welcome
                </span>
                <h1 className="font-heading text-base sm:text-lg font-extrabold text-white tracking-tight truncate">
                  {customerDisplayName}
                </h1>
              </div>

              <p className="text-[11px] sm:text-xs text-rose-100/90 font-medium">
                Your DigiGold savings are growing securely.
              </p>
            </div>

            {/* Total Gold Accumulated Pill (Compact & Elegant) */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-3 py-2 flex items-center gap-3 shrink-0 self-start sm:self-auto">
              <div className="h-8 w-8 rounded-lg bg-amber-500/25 flex items-center justify-center border border-amber-400/40 shrink-0">
                <Coins className="h-4 w-4 text-amber-300" />
              </div>
              <div className="leading-none">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-rose-200">Gold:</span>
                  <span className="text-sm sm:text-base font-black text-white font-mono">
                    {totalGoldGramsSaved > 0 ? `${totalGoldGramsSaved.toFixed(3)} g` : '0.000 g'}
                  </span>
                </div>
                <p className="text-[9.5px] text-rose-200/90 font-semibold mt-0.5">
                  ≈ {(totalGoldGramsSaved / 8).toFixed(2)} Sov | {formatINR(totalMoneyInvested)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Live 22K Gold & Silver Rate Marquee Ticker Strip (High Contrast) ── */}
      <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-950 via-amber-950 to-slate-950 border border-amber-500/40 py-1.5 px-2.5 sm:px-3 text-white shadow-md">
          <div className="flex items-center gap-2.5">
            {/* Live Ticker Badge */}
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-black text-[9.5px] uppercase tracking-wider shrink-0 shadow-xs z-10">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-950 animate-pulse" /> Live Rates
            </div>

            {/* Infinite Scrolling Marquee Container */}
            <div className="overflow-hidden relative w-full flex items-center">
              <motion.div
                animate={{ x: ['0%', '-50%'] }}
                transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
                className="flex items-center gap-5 sm:gap-7 whitespace-nowrap text-[11px] font-bold text-white"
              >
                {/* Item 1: 22K Gold Rate */}
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-amber-300 font-extrabold flex items-center gap-1">
                    <Coins className="h-3 w-3 inline text-amber-400" /> 22K Gold Rate:
                  </span>
                  <span className="font-mono text-amber-100 font-black text-xs">
                    {rate22k ? `${formatINR(rate22k)}/g` : '₹7,850/g'}
                  </span>
                  {delta22k !== null && (
                    <span className={`text-[9.5px] font-black px-1.5 py-0.2 rounded-md ${delta22k >= 0 ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'}`}>
                      {delta22k >= 0 ? '▲ +' : '▼ '}{formatINR(Math.abs(delta22k))}
                    </span>
                  )}
                </span>

                <span className="text-amber-500/50 font-normal">•</span>

                {/* Item 2: Silver Rate */}
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-slate-300 font-extrabold flex items-center gap-1">
                    <Sparkles className="h-3 w-3 inline text-slate-300" /> 999 Fine Silver:
                  </span>
                  <span className="font-mono text-white font-black text-xs">
                    {todayRate?.silver_rate ? `${formatINR(todayRate.silver_rate)}/g` : '₹95.00/g'}
                  </span>
                  <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded-md bg-emerald-500 text-slate-950">
                    ▲ +₹0.80
                  </span>
                </span>

                <span className="text-amber-500/50 font-normal">•</span>

                {/* Item 3: BIS Hallmark Verification */}
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-200 font-extrabold">
                  <Award className="h-3 w-3 text-amber-400 inline" /> BIS 916 Hallmarked Pure Savings
                </span>

                <span className="text-amber-500/50 font-normal">•</span>

                {/* Duplicate Loop Items for Smooth Continuous Marquee */}
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-amber-300 font-extrabold flex items-center gap-1">
                    <Coins className="h-3 w-3 inline text-amber-400" /> 22K Gold Rate:
                  </span>
                  <span className="font-mono text-amber-100 font-black text-xs">
                    {rate22k ? `${formatINR(rate22k)}/g` : '₹7,850/g'}
                  </span>
                  {delta22k !== null && (
                    <span className={`text-[9.5px] font-black px-1.5 py-0.2 rounded-md ${delta22k >= 0 ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'}`}>
                      {delta22k >= 0 ? '▲ +' : '▼ '}{formatINR(Math.abs(delta22k))}
                    </span>
                  )}
                </span>

                <span className="text-amber-500/50 font-normal">•</span>

                <span className="inline-flex items-center gap-1.5">
                  <span className="text-slate-300 font-extrabold flex items-center gap-1">
                    <Sparkles className="h-3 w-3 inline text-slate-300" /> 999 Fine Silver:
                  </span>
                  <span className="font-mono text-white font-black text-xs">
                    {todayRate?.silver_rate ? `${formatINR(todayRate.silver_rate)}/g` : '₹95.00/g'}
                  </span>
                  <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded-md bg-emerald-500 text-slate-950">
                    ▲ +₹0.80
                  </span>
                </span>

                <span className="text-amber-500/50 font-normal">•</span>

                <span className="inline-flex items-center gap-1 text-[11px] text-amber-200 font-extrabold">
                  <Award className="h-3 w-3 text-amber-400 inline" /> BIS 916 Hallmarked Pure Savings
                </span>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Pure Promotional Sliding Banner Image Carousel ── */}
      {activeSliders.length > 0 && (
        <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible">
          <div className="relative rounded-3xl overflow-hidden border border-amber-500/30 shadow-xl shadow-amber-500/10 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-amber-500/15 backdrop-blur-xl aspect-[2/1] sm:aspect-[2.4/1] max-h-[270px] group cursor-pointer">
            <AnimatePresence initial={false} custom={slideDirection}>
              <motion.div
                key={activeSliders[currentSlide % activeSliders.length].id}
                custom={slideDirection}
                variants={slideAnimationVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: 'spring', stiffness: 280, damping: 28 },
                  opacity: { duration: 0.4 },
                  scale: { duration: 0.5 },
                  filter: { duration: 0.3 },
                }}
                className="absolute inset-0 overflow-hidden"
              >
                {activeSliders[currentSlide % activeSliders.length].target_link ? (
                  <Link to={activeSliders[currentSlide % activeSliders.length].target_link || '/customer/schemes'} className="block w-full h-full">
                    <motion.img
                      src={activeSliders[currentSlide % activeSliders.length].image_url}
                      alt={activeSliders[currentSlide % activeSliders.length].title || 'Promo Banner'}
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-full h-full object-cover"
                    />
                  </Link>
                ) : (
                  <motion.img
                    src={activeSliders[currentSlide % activeSliders.length].image_url}
                    alt={activeSliders[currentSlide % activeSliders.length].title || 'Promo Banner'}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-full h-full object-cover"
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Prev / Next Arrows */}
            {activeSliders.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/80 backdrop-blur-md border border-amber-500/30 text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-amber-500 hover:text-white shadow-md cursor-pointer z-20"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={handleNextSlide}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/80 backdrop-blur-md border border-amber-500/30 text-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-amber-500 hover:text-white shadow-md cursor-pointer z-20"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                {/* Dots Indicator */}
                <div className="absolute bottom-3 right-4 flex items-center gap-1.5 z-20 bg-background/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-500/20 shadow-sm">
                  {activeSliders.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectSlide(idx)}
                      className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${(currentSlide % activeSliders.length) === idx
                          ? 'w-6 bg-amber-500 shadow-sm shadow-amber-500/50'
                          : 'w-2 bg-amber-500/30 hover:bg-amber-500/50'
                        }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* ── My Active Gold Savings ATM Card Section (Moved to Bottom with Increased Height) ── */}
      {(() => {
        const currentChit = activeChits[selectedChitIndex] || activeChits[0] || null
        const payments = currentChit?.payments || []
        const duesPaidCount = payments.length
        const totalDurationMonths = currentChit?.scheme?.duration_months || 11

        let chitTotalPaid = 0
        let chitGoldWeightGrams = 0
        payments.forEach((p: any) => {
          chitTotalPaid += p.amount || 0
          if (p.gold_weight_grams) {
            chitGoldWeightGrams += p.gold_weight_grams
          } else if (rate22k && rate22k > 0) {
            chitGoldWeightGrams += (p.amount || 0) / rate22k
          }
        })

        // Calculate accurate dues paid: check payment receipts count and total paid amount
        const agreedAmt = currentChit?.agreed_amount || 5000
        const calculatedDuesByAmount = agreedAmt > 0 ? Math.floor(chitTotalPaid / agreedAmt) : 0
        const effectiveDuesPaid = Math.max(duesPaidCount, calculatedDuesByAmount)

        const progressPercent = currentChit && totalDurationMonths > 0
          ? Math.min(100, Math.max(0, (effectiveDuesPaid / totalDurationMonths) * 100))
          : 0

        return (
          <motion.div custom={2.5} variants={cardVariants} initial="hidden" animate="visible" className="space-y-3">
            {/* Header Section Label */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-amber-500" />
                <h3 className="font-heading font-extrabold text-base text-foreground tracking-tight">
                  My Active Gold Passbook Card
                </h3>
                {activeChits.length > 0 && (
                  <Badge variant="outline" className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-black uppercase py-0.5 px-2">
                    {activeChits.length} Active Scheme{activeChits.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              {/* Multi-Chit Switcher Dots */}
              {activeChits.length > 1 && (
                <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-full border border-border/60">
                  {activeChits.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedChitIndex(idx)}
                      className={`h-2.5 rounded-full transition-all cursor-pointer ${
                        selectedChitIndex === idx ? 'w-6 bg-amber-500 shadow-xs' : 'w-2.5 bg-muted-foreground/40'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ATM Card Visual Container (Swipeable Carousel) */}
            {activeChits.length > 0 && currentChit ? (
              <div className="relative group">
                <AnimatePresence mode="wait" initial={false} custom={cardDirection}>
                  <motion.div
                    key={currentChit.id || selectedChitIndex}
                    custom={cardDirection}
                    initial={{ opacity: 0, x: cardDirection > 0 ? 80 : -80, scale: 0.96 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: cardDirection > 0 ? -80 : 80, scale: 0.96 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -40 || info.velocity.x < -200) {
                        if (activeChits.length > 1) {
                          setCardDirection(1)
                          setSelectedChitIndex(prev => (prev + 1) % activeChits.length)
                        }
                      } else if (info.offset.x > 40 || info.velocity.x > 200) {
                        if (activeChits.length > 1) {
                          setCardDirection(-1)
                          setSelectedChitIndex(prev => (prev - 1 + activeChits.length) % activeChits.length)
                        }
                      }
                    }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-amber-500/15 via-yellow-500/10 to-amber-600/20 dark:from-slate-950 dark:via-amber-950 dark:to-slate-900 border border-amber-500/40 dark:border-amber-400/50 p-5 sm:p-5.5 min-h-[200px] sm:min-h-[215px] shadow-lg shadow-amber-500/10 dark:shadow-xl dark:shadow-amber-950/30 text-foreground dark:text-white flex flex-col justify-between cursor-grab active:cursor-grabbing touch-pan-y"
                  >
                    {/* Background Shimmer & Mesh Pattern Overlays */}
                    <div className="absolute -top-24 -right-24 h-52 w-52 rounded-full bg-gradient-to-br from-amber-400/20 via-yellow-500/10 to-transparent blur-2xl pointer-events-none" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(245,158,11,0.12)_1px,transparent_0)] bg-[size:20px_20px] pointer-events-none opacity-30" />

                    {/* Top Row: VIP Brand Badge & Contactless Wave Signal */}
                    <div className="relative z-10 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-slate-950 font-heading font-extrabold text-xs flex items-center justify-center shadow-xs border border-amber-200">
                          DG
                        </div>
                        <div>
                          <p className="text-xs font-black tracking-wider uppercase text-amber-700 dark:text-amber-200 leading-tight">DigiGold VIP Passbook Card</p>
                          <p className="text-[9.5px] text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-widest">{currentChit.scheme?.name || 'Gold Savings Chit'}</p>
                        </div>
                      </div>

                      {/* Contactless Signal + BIS 916 Hallmark */}
                      <div className="flex items-center gap-1.5">
                        <svg className="h-5 w-5 text-amber-600 dark:text-amber-300 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M8.5 14.5A5 5 0 0 1 8.5 9.5" strokeLinecap="round" />
                          <path d="M12 17A9 9 0 0 0 12 7" strokeLinecap="round" />
                          <path d="M15.5 19.5A13 13 0 0 0 15.5 4.5" strokeLinecap="round" />
                        </svg>
                        <span className="text-[9px] font-black tracking-widest text-amber-700 dark:text-amber-300 uppercase bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 backdrop-blur-md">
                          BIS 916
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Gold Metallic Chip & Card Account Number */}
                    <div className="relative z-10 my-3 flex items-center justify-between gap-3">
                      {/* Metallic EMV Microchip */}
                      <div className="h-8 w-11 rounded-md bg-gradient-to-br from-yellow-200 via-amber-400 to-amber-600 border border-yellow-100 shadow-xs relative overflow-hidden shrink-0 flex flex-col justify-between p-0.5">
                        <div className="w-full h-[1px] bg-amber-800/60" />
                        <div className="flex justify-between items-center">
                          <div className="h-2 w-3 border-r border-amber-800/60" />
                          <div className="h-2 w-3 border-l border-amber-800/60" />
                        </div>
                        <div className="w-full h-[1px] bg-amber-800/60" />
                      </div>

                      {/* Formatted VIP Card Number */}
                      <div className="font-mono text-xs sm:text-sm tracking-[0.22em] font-extrabold text-foreground dark:text-amber-100 drop-shadow-xs truncate">
                        4591 •••• •••• {currentChit.id ? currentChit.id.slice(-4).toUpperCase() : '9162'}
                      </div>
                    </div>

                    {/* Dues Progress Bar */}
                    <div className="relative z-10 space-y-1.5 mb-3">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-amber-800 dark:text-amber-200/90 uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 dark:text-emerald-400" /> Dues: {effectiveDuesPaid} / {totalDurationMonths} Months
                        </span>
                        <span className="text-amber-600 dark:text-amber-300 font-mono font-extrabold">{progressPercent.toFixed(0)}% Done</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-amber-500/20 dark:bg-slate-950/80 border border-amber-500/40 overflow-hidden p-0.5 shadow-inner">
                        <div
                          style={{ width: `${Math.min(100, Math.max(progressPercent, 3))}%` }}
                          className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-500 shadow-[0_0_10px_rgba(245,158,11,0.9)] transition-all duration-700 ease-out"
                        />
                      </div>
                    </div>

                    {/* Bottom Row: Card Details & Pay Action Button */}
                    <div className="relative z-10 flex items-center justify-between gap-2 pt-3 border-t border-amber-500/25">
                      <div className="grid grid-cols-3 gap-2 flex-1">
                        {/* 1. Cardholder Name */}
                        <div>
                          <p className="text-[8px] uppercase tracking-widest text-muted-foreground dark:text-amber-300/80 font-extrabold">CARDHOLDER</p>
                          <p className="text-[11px] sm:text-xs font-black text-foreground dark:text-white truncate tracking-wider uppercase font-mono">
                            {customerDisplayName}
                          </p>
                        </div>

                        {/* 2. Monthly Due */}
                        <div>
                          <p className="text-[8px] uppercase tracking-widest text-muted-foreground dark:text-amber-300/80 font-extrabold">MONTHLY DUE</p>
                          <p className="text-[11px] sm:text-xs font-extrabold text-amber-600 dark:text-amber-300 font-mono">
                            {formatINR(currentChit.agreed_amount || 5000)}
                          </p>
                        </div>

                        {/* 3. Gold Weight Accumulation */}
                        <div>
                          <p className="text-[8px] uppercase tracking-widest text-muted-foreground dark:text-amber-300/80 font-extrabold">SAVED GOLD</p>
                          <p className="text-[11px] sm:text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                            {chitGoldWeightGrams.toFixed(3)} g
                          </p>
                        </div>
                      </div>

                      {/* Pay Installment Quick Action Button OR Matured/Paid Status Button */}
                      {(() => {
                        const isMatured = effectiveDuesPaid >= totalDurationMonths || progressPercent >= 100 || currentChit.status === 'redeemed' || currentChit.status === 'closed'

                        if (isMatured) {
                          return (
                            <Button
                              type="button"
                              onClick={() => {
                                toast.success(
                                  '🎉 Scheme Matured! Please contact or visit your store with ID proof to redeem your gold ornaments & 100% free bonus.',
                                  { duration: 6000 }
                                )
                              }}
                              className="h-8.5 text-[10.5px] font-black px-3 rounded-lg shrink-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white shadow-md shadow-emerald-500/25 border border-emerald-300 flex flex-col items-center justify-center py-0.5 leading-tight gap-0 hover:from-emerald-600 hover:to-teal-600 cursor-pointer"
                            >
                              <div className="flex items-center gap-1 font-black text-[10.5px]">
                                <Gift className="h-3 w-3 text-amber-200 shrink-0" /> Redeem Gold
                              </div>
                              <span className="text-[8px] font-bold text-emerald-100 uppercase tracking-wider">
                                Contact Shop
                              </span>
                            </Button>
                          )
                        }

                        const dueDay = currentChit.monthly_due_day || 10
                        const suffix = dueDay === 1 || dueDay === 21 || dueDay === 31 ? 'st' : dueDay === 2 || dueDay === 22 ? 'nd' : dueDay === 3 || dueDay === 23 ? 'rd' : 'th'

                        // Check if payment was recorded for current calendar month
                        const currentMonthPrefix = new Date().toISOString().slice(0, 7) // "YYYY-MM"
                        const isPaidThisMonth = (currentChit.payments || []).some((p: any) => {
                          const pDate = p.payment_date || p.created_at
                          return pDate && pDate.startsWith(currentMonthPrefix)
                        })

                        if (isPaidThisMonth) {
                          return (
                            <Button
                              type="button"
                              onClick={() => setSelectedChitForPayment(currentChit)}
                              className="h-8.5 text-[10.5px] font-black px-3 rounded-lg shrink-0 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white shadow-sm border border-emerald-400/50 flex flex-col items-center justify-center py-0.5 leading-tight gap-0 opacity-95 hover:opacity-100 cursor-pointer"
                            >
                              <div className="flex items-center gap-1 font-black text-[10.5px]">
                                <CheckCircle2 className="h-3 w-3 text-emerald-300 shrink-0" /> Paid This Month
                              </div>
                              <span className="text-[8px] font-bold text-emerald-100 uppercase tracking-wider">
                                Next Due {dueDay}{suffix}
                              </span>
                            </Button>
                          )
                        }

                        const todayDay = new Date().getDate()
                        const isOverdue = todayDay > dueDay

                        if (isOverdue) {
                          return (
                            <Button
                              type="button"
                              onClick={() => setSelectedChitForPayment(currentChit)}
                              className="h-8.5 text-[10.5px] font-black px-3.5 rounded-lg shrink-0 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white shadow-md shadow-rose-600/30 border border-rose-400 flex flex-col items-center justify-center py-0.5 leading-tight gap-0 hover:from-rose-700 hover:to-red-700 animate-pulse cursor-pointer"
                            >
                              <div className="flex items-center gap-1 font-black text-[10.5px]">
                                <AlertTriangle className="h-3 w-3 text-amber-200 shrink-0" /> Pay Overdue
                              </div>
                              <span className="text-[8px] font-extrabold text-rose-100 uppercase tracking-wider">
                                Crossed ({dueDay}{suffix})
                              </span>
                            </Button>
                          )
                        }

                        return (
                          <GoldButton
                            onClick={() => setSelectedChitForPayment(currentChit)}
                            className="h-8.5 text-[11px] font-black px-3.5 rounded-lg shrink-0 shadow-md shadow-amber-500/20 border border-yellow-200 flex flex-col items-center justify-center py-0.5 leading-tight gap-0"
                          >
                            <div className="flex items-center gap-1 font-black text-[11px]">
                              <CreditCard className="h-3 w-3" /> Pay Due Now
                            </div>
                            <span className="text-[8.5px] font-bold text-slate-950/80 uppercase tracking-wider">
                              Due {dueDay}{suffix}
                            </span>
                          </GoldButton>
                        )
                      })()}
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Left & Right Swipe Navigation Buttons */}
                {activeChits.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setCardDirection(-1)
                        setSelectedChitIndex(prev => (prev - 1 + activeChits.length) % activeChits.length)
                      }}
                      className="absolute left-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-background/85 backdrop-blur-md border border-amber-500/40 text-foreground flex items-center justify-center shadow-md hover:bg-amber-500 hover:text-white transition-all z-20 opacity-80 group-hover:opacity-100 cursor-pointer"
                      title="Previous Card"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCardDirection(1)
                        setSelectedChitIndex(prev => (prev + 1) % activeChits.length)
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-background/85 backdrop-blur-md border border-amber-500/40 text-foreground flex items-center justify-center shadow-md hover:bg-amber-500 hover:text-white transition-all z-20 opacity-80 group-hover:opacity-100 cursor-pointer"
                      title="Next Card"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            ) : (
              /* Virtual ATM Demo Preview Card & Featured Schemes Showcase for Unenrolled Customers */
              <div className="space-y-4">
                {/* Virtual ATM Demo Passbook Card */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-amber-500/15 via-yellow-500/10 to-amber-600/20 dark:from-slate-950 dark:via-amber-950 dark:to-slate-900 border-2 border-dashed border-amber-500/50 p-5 sm:p-6 shadow-xl shadow-amber-500/10 dark:shadow-2xl dark:shadow-amber-950/40 text-foreground dark:text-white min-h-[220px] sm:min-h-[240px] flex flex-col justify-between group">
                  <div className="absolute -top-24 -right-24 h-60 w-60 rounded-full bg-gradient-to-br from-amber-400/25 via-yellow-500/10 to-transparent blur-3xl pointer-events-none" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(245,158,11,0.15)_1px,transparent_0)] bg-[size:24px_24px] pointer-events-none opacity-40" />

                  {/* Top Row: VIP Brand Badge & Sample Tag */}
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-slate-950 font-heading font-extrabold text-sm flex items-center justify-center shadow-md border border-amber-200">
                        DG
                      </div>
                      <div>
                        <p className="text-xs font-black tracking-wider uppercase text-amber-700 dark:text-amber-200 leading-tight">DigiGold VIP Passbook Card</p>
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-widest">SAMPLE PREVIEW • 11+1 BONUS</p>
                      </div>
                    </div>

                    <span className="text-[9.5px] font-black tracking-widest text-amber-700 dark:text-amber-300 uppercase bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/30 backdrop-blur-md">
                      ⭐ ACTIVATE NOW
                    </span>
                  </div>

                  {/* Middle Row: Gold Metallic Chip & Sample Account Number */}
                  <div className="relative z-10 my-3 flex items-center justify-between gap-4">
                    <div className="h-9 w-12 rounded-lg bg-gradient-to-br from-yellow-200 via-amber-400 to-amber-600 border border-yellow-100 shadow-md relative overflow-hidden shrink-0 flex flex-col justify-between p-1 opacity-90">
                      <div className="w-full h-[1px] bg-amber-800/60" />
                      <div className="flex justify-between items-center">
                        <div className="h-3 w-4 border-r border-amber-800/60" />
                        <div className="h-3 w-4 border-l border-amber-800/60" />
                      </div>
                      <div className="w-full h-[1px] bg-amber-800/60" />
                    </div>

                    <div className="font-mono text-base sm:text-lg tracking-[0.25em] font-extrabold text-foreground dark:text-amber-100 opacity-80 truncate">
                      4591 •••• •••• PREVIEW
                    </div>
                  </div>

                  {/* Dues Progress Bar Preview */}
                  <div className="relative z-10 space-y-1.5 mb-2">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-amber-800 dark:text-amber-200/90 uppercase tracking-wider">
                        🎁 Store Perk: Pay 11 Months, Get 12th Month 100% FREE!
                      </span>
                      <span className="text-amber-600 dark:text-amber-300 font-mono font-extrabold">+1 Month Bonus</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-amber-500/10 dark:bg-slate-950/80 border border-amber-500/30 overflow-hidden p-0.5">
                      <div className="h-full w-1/12 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 animate-pulse" />
                    </div>
                  </div>

                  {/* Bottom Row: Card Details & Activate Button */}
                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-amber-500/25">
                    <div>
                      <p className="text-xs font-extrabold text-foreground dark:text-white">Start Your Gold Savings Journey</p>
                      <p className="text-[11px] text-muted-foreground">Select a plan below to activate your digital ATM card.</p>
                    </div>

                    <GoldButton
                      onClick={() => availableSchemes.length > 0 && setSelectedSchemeForEnroll(availableSchemes[0])}
                      className="h-9.5 text-xs font-black px-5 rounded-xl shrink-0 shadow-lg shadow-amber-500/25 gap-1.5 border border-yellow-200"
                    >
                      <Sparkles className="h-4 w-4" /> Activate Card Now
                    </GoldButton>
                  </div>
                </div>

                {/* Featured Popular Schemes Grid */}
                {availableSchemes.length > 0 && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-heading font-extrabold text-base text-foreground flex items-center gap-2">
                          <Crown className="h-4.5 w-4.5 text-amber-500" /> Popular Gold Savings Schemes
                        </h4>
                        <p className="text-xs text-muted-foreground">Select a scheme to enroll instantly</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {availableSchemes.map(scheme => (
                        <Card
                          key={scheme.id}
                          className="p-4 border-amber-500/30 hover:border-amber-500/60 bg-gradient-to-br from-card via-amber-500/5 to-card shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                        >
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-start gap-2">
                              <h5 className="font-extrabold text-sm text-foreground">{scheme.name}</h5>
                              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[9.5px] font-extrabold uppercase shrink-0">
                                {scheme.duration_months} Months
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {scheme.description || 'Monthly gold accumulation plan with 1 month store bonus.'}
                            </p>
                          </div>

                          <div className="space-y-2 pt-2 border-t border-border/50">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground font-semibold">Min Monthly:</span>
                              <strong className="text-amber-600 dark:text-amber-400 font-extrabold">{formatINR(scheme.min_installment)}/mo</strong>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground font-semibold">Store Perk:</span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                                <Gift className="h-3 w-3" /> +1 Month FREE
                              </span>
                            </div>

                            <GoldButton
                              onClick={() => {
                                setSelectedSchemeForEnroll(scheme)
                                setEnrollMonthlyAmount(scheme.min_installment.toString())
                              }}
                              className="w-full h-8.5 text-xs font-bold mt-1 gap-1"
                            >
                              Enroll in {scheme.name} <ArrowRight className="h-3.5 w-3.5" />
                            </GoldButton>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )
      })()}

      {/* ── Direct Self-Enrollment Confirmation Dialog ──────────── */}
      <Dialog open={!!selectedSchemeForEnroll} onOpenChange={() => setSelectedSchemeForEnroll(null)}>
        <DialogContent className="sm:max-w-[420px] p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-500 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-extrabold text-foreground">
                Enroll in {selectedSchemeForEnroll?.name}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">Select your monthly budget and due date</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Monthly Installment Amount (₹)</Label>
              <Input
                type="number"
                min={selectedSchemeForEnroll?.min_installment || 1000}
                step={500}
                value={enrollMonthlyAmount}
                onChange={e => setEnrollMonthlyAmount(e.target.value)}
                className="h-10 text-sm font-extrabold text-amber-600 dark:text-amber-400"
              />
              <p className="text-[10.5px] text-muted-foreground">
                Minimum required: {formatINR(selectedSchemeForEnroll?.min_installment || 1000)}/month
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Select Preferred Monthly Due Day</Label>
              <select
                value={enrollDueDay}
                onChange={e => setEnrollDueDay(e.target.value)}
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {[1, 5, 10, 15, 20, 25].map(day => (
                  <option key={day} value={day}>
                    Every {day}th of the month
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
              <div className="flex justify-between font-semibold">
                <span>Plan Duration:</span>
                <span>{selectedSchemeForEnroll?.duration_months || 11} Months</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Store Free Bonus:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">+1 Month Free</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedSchemeForEnroll(null)} className="text-xs">
              Cancel
            </Button>
            <GoldButton
              disabled={selfEnrollMutation.isPending}
              onClick={() => selfEnrollMutation.mutate()}
              className="w-full text-xs font-bold h-10"
            >
              {selfEnrollMutation.isPending ? 'Enrolling...' : 'Confirm & Start Saving Gold'}
            </GoldButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Scheme Payment Modal Trigger ── */}
      {selectedChitForPayment && (
        <SchemePaymentModal
          chit={selectedChitForPayment}
          onClose={() => {
            setSelectedChitForPayment(null)
            queryClient.invalidateQueries({ queryKey: ['my-chits-full-resilient'] })
            queryClient.invalidateQueries({ queryKey: ['my-chits'] })
          }}
        />
      )}
    </div>
  )
}
