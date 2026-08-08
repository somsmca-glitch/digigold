import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Scheme } from '@/types/database'
import { Card } from '@/components/ui/card'
import { GoldButton } from '@/components/ui/gold-button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatINR } from '@/lib/utils'
import {
  Sparkles,
  Gift,
  Calendar,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Crown,
  Coins,
  CheckCircle2,
  Zap,
} from 'lucide-react'
import { SchemeEnrollmentModal } from '@/components/customer/SchemeEnrollmentModal'

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: 'easeOut' },
  }),
}

export const CustomerSchemes: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null)
  const [agreedAmount, setAgreedAmount] = useState<string>('')
  const [dueDay, setDueDay] = useState<string>('10')

  // ── Fetch available schemes ──────────────────────────────────
  const { data: schemes = [], isLoading } = useQuery<Scheme[]>({
    queryKey: ['active-schemes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chit_schemes')
        .select('*')
        .order('duration_months', { ascending: true })
      if (error) throw error
      return (data as Scheme[]) ?? []
    },
  })

  // ── Enroll mutation ──────────────────────────────────────────
  const enrollMutation = useMutation({
    mutationFn: async (payload: { amount?: number; day?: number } = {}) => {
      if (!selectedScheme || !user) throw new Error('User or scheme not selected')

      const finalAmount = payload?.amount ?? (parseFloat(agreedAmount) || selectedScheme.min_installment)
      const finalDueDay = payload?.day ?? (parseInt(dueDay) || 5)

      const today = new Date()
      const startDateStr = today.toISOString().split('T')[0]
      const maturity = new Date(today)
      maturity.setMonth(maturity.getMonth() + selectedScheme.duration_months)

      const { data, error } = await supabase
        .from('customer_chits')
        .insert({
          customer_id: user.id,
          scheme_id: selectedScheme.id,
          start_date: startDateStr,
          maturity_date: maturity.toISOString().split('T')[0],
          monthly_due_day: finalDueDay,
          agreed_amount: finalAmount,
          status: 'active',
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('🎉 Successfully enrolled in scheme!')
      queryClient.invalidateQueries({ queryKey: ['my-chits'] })
      queryClient.invalidateQueries({ queryKey: ['my-chits-full-resilient'] })
      queryClient.invalidateQueries({ queryKey: ['my-chits-summary'] })
      setSelectedScheme(null)
      setAgreedAmount('')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Enrollment failed')
    },
  })

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Sleek Compact Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 p-4 rounded-2xl border border-amber-500/30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-slate-950 flex items-center justify-center font-bold shadow-md shrink-0 border border-amber-200">
            <Crown className="h-5 w-5 text-slate-950" />
          </div>
          <div>
            <h1 className="font-heading text-lg sm:text-xl font-black tracking-tight text-foreground flex items-center gap-2">
              Gold Savings Schemes
            </h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              Build your gold wealth systematically with BIS 916 hallmarked pure gold & 100% store bonus!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 text-[10px] sm:text-xs px-2.5 py-0.5 font-extrabold">
            🛡️ BIS 916
          </Badge>
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 text-[10px] sm:text-xs px-2.5 py-0.5 font-extrabold">
            🎁 Store Bonus
          </Badge>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-44 rounded-2xl bg-muted/40 animate-pulse border border-border/40" />
          ))}
        </div>
      ) : (
        /* Uniform Luxury Gold Banner Scheme Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schemes.map((scheme, i) => (
            <motion.div
              key={scheme.id}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ y: -2 }}
              className="rounded-2xl"
            >
              <Card className="relative overflow-hidden border border-amber-500/35 hover:border-amber-400/80 shadow-md shadow-amber-500/5 hover:shadow-xl hover:shadow-amber-500/15 transition-all duration-250 bg-gradient-to-b from-amber-500/[0.03] via-card to-card flex flex-col justify-between group rounded-2xl">

                {/* Top Gold Metallic Header Banner */}
                <div className="relative h-16 sm:h-18 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 p-3 sm:p-3.5 flex items-center justify-between overflow-hidden shadow-xs">
                  {/* Decorative Mesh Overlay & Shimmer Accent */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.25)_1px,transparent_0)] bg-[size:14px_14px] pointer-events-none opacity-40" />
                  <div className="absolute -right-8 -bottom-8 h-28 w-28 rounded-full bg-white/15 blur-xl pointer-events-none" />

                  {/* Left: Scheme Name & Hallmark Badge */}
                  <div className="relative z-10 flex items-center gap-2.5 text-slate-950">
                    <div className="h-8.5 w-8.5 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0 shadow-md border border-amber-300">
                      <Coins className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="font-heading text-sm sm:text-base font-black tracking-tight leading-tight text-slate-950">
                        {scheme.name}
                      </h3>
                      <p className="text-[9.5px] text-slate-900/90 font-extrabold flex items-center gap-1 mt-0.5">
                        <ShieldCheck className="h-3 w-3 text-slate-950" /> BIS 916 Pure Gold • 22K/24K
                      </p>
                    </div>
                  </div>

                  {/* Right: Store Bonus Banner Badge */}
                  <Badge className="relative z-10 shrink-0 bg-slate-950 text-amber-300 font-black text-[10px] px-2.5 py-1 shadow-md border border-amber-400/60 uppercase tracking-wider">
                    {scheme.bonus_months > 0 ? `🎁 ${scheme.bonus_months} Mo Free` : 'VIP Bonus'}
                  </Badge>
                </div>

                {/* Card Body Content */}
                <div className="p-3.5 sm:p-4 space-y-3">
                  {/* Middle Row: Inline Stats Metrics */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-950/25 border border-amber-500/20 backdrop-blur-xs">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div>
                        <p className="text-[8.5px] font-black uppercase text-muted-foreground tracking-widest">DURATION</p>
                        <p className="text-xs font-extrabold text-foreground font-mono">{scheme.duration_months} Months</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-[8.5px] font-black uppercase text-muted-foreground tracking-widest">MIN MONTHLY</p>
                        <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">{formatINR(scheme.min_installment)}/mo</p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Quick Benefit & Action Button */}
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-amber-500/20">
                    <span className="text-[10.5px] font-bold text-foreground/90 truncate flex items-center gap-1">
                      <Gift className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      {scheme.gift_description || '100% Free Store Bonus at maturity!'}
                    </span>

                    <GoldButton
                      className="h-8 py-0 px-3.5 text-[11px] font-black rounded-lg shadow-md shadow-amber-500/20 shrink-0 gap-1.5"
                      onClick={() => {
                        setSelectedScheme(scheme)
                        setAgreedAmount(scheme.min_installment.toString())
                      }}
                    >
                      <Zap className="h-3 w-3 fill-current" /> Quick Enroll <ArrowRight className="h-3 w-3" />
                    </GoldButton>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}

          {schemes.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 gap-2 text-center rounded-2xl border border-dashed border-amber-500/30">
              <Sparkles className="h-8 w-8 text-amber-500/40" />
              <p className="font-semibold text-sm text-foreground">No schemes available right now</p>
              <p className="text-xs text-muted-foreground">Please check back soon for exciting new gold savings schemes.</p>
            </div>
          )}
        </div>
      )}

      {/* ── 80% Height Bottom Sheet Scheme Enrollment Modal ─────────── */}
      <SchemeEnrollmentModal
        scheme={selectedScheme}
        onClose={() => setSelectedScheme(null)}
        onEnroll={async (amount, day) => {
          enrollMutation.mutate({ amount, day })
        }}
        isPending={enrollMutation.isPending}
      />
    </div>
  )
}
