import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Scheme } from '@/types/database'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GoldButton } from '@/components/ui/gold-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { formatINR } from '@/lib/utils'
import {
  Layers, Plus, Gift, Calendar, Sparkles, Award,
  Zap, Coins, Ticket, Tag, Eye,
  ScrollText, ChevronDown, ChevronUp, Scale, Landmark,
  CheckCircle2, Search, TrendingUp, Sparkle, ShieldCheck
} from 'lucide-react'

export const SchemesPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [openAdd, setOpenAdd] = useState(false)
  const [expandedTcId, setExpandedTcId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'gold_rate_linked' | 'fixed'>('all')

  // Form State for Scheme Creation
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [schemeType, setSchemeType] = useState<'fixed' | 'gold_rate_linked'>('gold_rate_linked')
  const [durationMonths, setDurationMonths] = useState('11')
  const [minInstallment, setMinInstallment] = useState('5000')
  const [bonusMonths, setBonusMonths] = useState('1')
  const [giftPreset, setGiftPreset] = useState<string>('gold_coin')
  const [customGift, setCustomGift] = useState('')
  const [giftValue, setGiftValue] = useState('2000')
  const [termsAndConditions, setTermsAndConditions] = useState(
    '1. Monthly deposits are converted to 22K gold weight based on prevailing daily gold rate.\n2. Customer accumulates gold grams month-by-month protecting against gold price inflation.\n3. Store bonus 12th month benefit credited on 11 consecutive timely payments.\n4. Accumulated gold grams redeemable for 22K/24K gold jewelry at maturity.'
  )

  // Fetch Today's Rate for Live Conversion Calculations
  const { data: today22kRate = 12800 } = useQuery({
    queryKey: ['today-rate-22k-schemes'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabase.from('gold_rates').select('rate_22k').eq('date', today).maybeSingle()
      return data?.rate_22k || 12800
    },
  })

  // Query Schemes
  const { data: schemes = [], isLoading } = useQuery({
    queryKey: ['schemes-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chit_schemes')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Scheme[]
    },
  })

  // Toggle Active Status Mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('chit_schemes')
        .update({ is_active })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Scheme status updated')
      queryClient.invalidateQueries({ queryKey: ['schemes-all'] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update status'),
  })

  // Create Scheme Mutation
  const addSchemeMutation = useMutation({
    mutationFn: async () => {
      let finalGiftText = ''
      if (giftPreset === 'gold_coin') finalGiftText = 'Complimentary 1 Gram 24K Gold Coin on Maturity'
      else if (giftPreset === 'silver_lamp') finalGiftText = 'Complimentary 10 Gram Pure Silver Pooja Item'
      else if (giftPreset === 'voucher') finalGiftText = `₹${giftValue || 2000} Jewelry Purchase Gift Voucher`
      else if (giftPreset === 'making_charges') finalGiftText = '100% Free Making Charges (0% VA) on Maturity'
      else finalGiftText = customGift

      const typeLabel = schemeType === 'gold_rate_linked' ? '[Gold Weight Based]' : '[Fixed Cash Value]'
      const combinedDesc = `${typeLabel} ${description || 'Jewelry Chit Plan'}${
        termsAndConditions ? `\n\n[Terms & Conditions]\n${termsAndConditions}` : ''
      }`

      const payload: any = {
        name: name || (schemeType === 'gold_rate_linked' ? 'Swarna Gold Weight Saver Plan' : 'Swarna Fixed Chit Plan'),
        description: combinedDesc,
        duration_months: parseInt(durationMonths) || 11,
        min_installment: parseFloat(minInstallment) || 1000,
        bonus_months: parseInt(bonusMonths) || 0,
        gift_description: finalGiftText || null,
        gift_value: parseFloat(giftValue) || null,
        is_active: true,
      }

      try {
        payload.scheme_type = schemeType
      } catch (e) {
        // Fallback
      }

      const { data, error } = await supabase
        .from('chit_schemes')
        .insert(payload)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Jewelry Scheme Plan created successfully!')
      queryClient.invalidateQueries({ queryKey: ['schemes-all'] })
      setOpenAdd(false)
      setName('')
      setDescription('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create scheme plan')
    },
  })

  // Computed Derived Gift Text for Live Preview
  const previewGiftText =
    giftPreset === 'gold_coin'
      ? 'Complimentary 1 Gram 24K Gold Coin'
      : giftPreset === 'silver_lamp'
      ? 'Complimentary 10 Gram Pure Silver Pooja Item'
      : giftPreset === 'voucher'
      ? `₹${giftValue || 2000} Purchase Voucher`
      : giftPreset === 'making_charges'
      ? '100% Free Making Charges (0% VA)'
      : customGift || 'Special Bonus Perk'

  const activeSchemesCount = schemes.filter(s => s.is_active !== false).length
  const goldRateLinkedCount = schemes.filter(s => s.scheme_type === 'gold_rate_linked' || s.description?.includes('[Gold Weight Based]')).length

  // Live estimated gold accumulation per month
  const estMonthlyGrams = (parseFloat(minInstallment) || 5000) / today22kRate
  const estTotalGrams = estMonthlyGrams * (parseInt(durationMonths) || 11)

  // Filter schemes
  const filteredSchemes = schemes.filter(scheme => {
    const isGoldLinked = scheme.scheme_type === 'gold_rate_linked' || scheme.description?.includes('[Gold Weight Based]')
    const matchesSearch = scheme.name.toLowerCase().includes(search.toLowerCase()) || (scheme.description || '').toLowerCase().includes(search.toLowerCase())
    if (filterType === 'gold_rate_linked') return matchesSearch && isGoldLinked
    if (filterType === 'fixed') return matchesSearch && !isGoldLinked
    return matchesSearch
  })

  return (
    <div className="space-y-8 pb-16">
      {/* ── ULTRA-PREMIUM HERO HEADER BANNER ──────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 backdrop-blur-xl p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-bold text-xs px-3 py-1 gap-1">
                <Sparkle className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Executive Chit Suite
              </Badge>
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold text-xs px-2.5 py-0.5 gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Rate-Linked & Cash Plans
              </Badge>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Chit Schemes & Savings Plans
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Design and manage gold weight rate-linked schemes, fixed cash installment plans, bonus month benefits, and customer gifts.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-3.5 rounded-2xl bg-card/80 border border-border/80 shadow-md backdrop-blur-sm min-w-[130px]">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Active Plans</p>
              <p className="text-xl font-extrabold text-foreground mt-0.5">{activeSchemesCount} <span className="text-xs font-normal text-muted-foreground">/ {schemes.length}</span></p>
            </div>
            <div className="p-3.5 rounded-2xl bg-card/80 border border-amber-500/30 shadow-md backdrop-blur-sm min-w-[140px]">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Live 22K Rate
              </p>
              <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">{formatINR(today22kRate)}<span className="text-xs text-muted-foreground font-normal">/g</span></p>
            </div>

            <Dialog open={openAdd} onOpenChange={setOpenAdd}>
              <DialogTrigger asChild>
                <GoldButton className="gap-2 shadow-xl shadow-amber-500/25 h-12 px-5 text-sm font-bold">
                  <Plus className="h-4 w-4" /> Create Scheme Plan
                </GoldButton>
              </DialogTrigger>

              {/* ── SCHEME CREATION MODAL ─────────────────── */}
              <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden border-2 border-amber-500/40 shadow-2xl">
                <DialogHeader className="p-6 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border-b border-amber-500/25">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-white flex items-center justify-center shadow-lg">
                      <Award className="h-5 w-5" />
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-extrabold text-foreground">
                        Create New Scheme Plan
                      </DialogTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Configure rate-linked or fixed cash chit model, bonus month & gifts
                      </p>
                    </div>
                  </div>
                </DialogHeader>

                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    addSchemeMutation.mutate()
                  }}
                  className="p-6 space-y-6 max-h-[78vh] overflow-y-auto"
                >
                  {/* Section 1: Scheme Model */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Scale className="h-3.5 w-3.5" /> 1. Select Plan Model
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Gold Weight Linked */}
                      <button
                        type="button"
                        onClick={() => setSchemeType('gold_rate_linked')}
                        className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                          schemeType === 'gold_rate_linked'
                            ? 'border-amber-500 bg-amber-500/15 text-foreground ring-2 ring-amber-500/40 shadow-md'
                            : 'border-border bg-card text-muted-foreground hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Scale className={`h-4 w-4 ${schemeType === 'gold_rate_linked' ? 'text-amber-500' : ''}`} />
                            <span className="text-xs font-extrabold text-foreground">Gold Weight Based Plan</span>
                          </div>
                          {schemeType === 'gold_rate_linked' && (
                            <Badge className="bg-amber-500 text-white text-[9px]">Daily Rate</Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          Monthly deposits converted into 22K Gold Weight at prevailing daily rates.
                        </p>
                      </button>

                      {/* Fixed Cash Plan */}
                      <button
                        type="button"
                        onClick={() => setSchemeType('fixed')}
                        className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                          schemeType === 'fixed'
                            ? 'border-amber-500 bg-amber-500/15 text-foreground ring-2 ring-amber-500/40 shadow-md'
                            : 'border-border bg-card text-muted-foreground hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Landmark className={`h-4 w-4 ${schemeType === 'fixed' ? 'text-amber-500' : ''}`} />
                            <span className="text-xs font-extrabold text-foreground">Fixed Cash Value Plan</span>
                          </div>
                          {schemeType === 'fixed' && (
                            <Badge className="bg-amber-500 text-white text-[9px]">Fixed Value</Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          Fixed monthly cash deposit with bonus month free contribution on maturity.
                        </p>
                      </button>
                    </div>

                    {schemeType === 'gold_rate_linked' && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs"
                      >
                        <span className="text-muted-foreground font-medium">
                          Current 22K Rate: <strong className="text-amber-600 dark:text-amber-400">{formatINR(today22kRate)}/g</strong>
                        </span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                          ≈ {estMonthlyGrams.toFixed(2)}g / month ({estTotalGrams.toFixed(2)}g total)
                        </span>
                      </motion.div>
                    )}
                  </div>

                  {/* Section 2: Title & Description */}
                  <div className="space-y-4 pt-2 border-t border-border/60">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> 2. Scheme Title & Pitch
                    </h3>

                    <div className="space-y-1.5">
                      <Label htmlFor="sname" className="text-xs font-bold">Scheme Plan Name</Label>
                      <Input
                        id="sname"
                        placeholder={
                          schemeType === 'gold_rate_linked'
                            ? 'e.g. Swarna Gold Gram Accumulator Plan'
                            : 'e.g. Swarna Prosperity 11-Month Plan'
                        }
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="h-10 text-sm border-amber-500/30 focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="sdesc" className="text-xs font-bold">Marketing Pitch & Summary</Label>
                      <Input
                        id="sdesc"
                        placeholder={
                          schemeType === 'gold_rate_linked'
                            ? 'Accumulate 22K gold weight daily & lock in gold prices against inflation.'
                            : 'Pay 11 monthly installments & get 12th month 100% free bonus + gift coin.'
                        }
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Section 3: Duration & Minimum Installment */}
                  <div className="space-y-4 pt-2 border-t border-border/60">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> 3. Term Duration & Monthly Amount
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Duration selector */}
                      <div className="space-y-2">
                        <Label htmlFor="sduration" className="text-xs font-bold">Duration (Months)</Label>
                        <div className="flex gap-1.5">
                          {['6', '11', '12', '24'].map(dur => (
                            <button
                              key={dur}
                              type="button"
                              onClick={() => setDurationMonths(dur)}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                durationMonths === dur
                                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                  : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              {dur}m
                            </button>
                          ))}
                        </div>
                        <Input
                          id="sduration"
                          type="number"
                          value={durationMonths}
                          onChange={(e) => setDurationMonths(e.target.value)}
                          required
                          className="h-9 text-xs"
                        />
                      </div>

                      {/* Min installment */}
                      <div className="space-y-2">
                        <Label htmlFor="smin" className="text-xs font-bold">Min Installment (₹/month)</Label>
                        <div className="flex gap-1.5">
                          {[1000, 2500, 5000, 10000].map(amt => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setMinInstallment(amt.toString())}
                              className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg border transition-all ${
                                minInstallment === amt.toString()
                                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                  : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              ₹{amt >= 1000 ? `${amt / 1000}k` : amt}
                            </button>
                          ))}
                        </div>
                        <Input
                          id="smin"
                          type="number"
                          value={minInstallment}
                          onChange={(e) => setMinInstallment(e.target.value)}
                          required
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Bonus Month */}
                  <div className="space-y-4 pt-2 border-t border-border/60">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5" /> 4. Bonus Month Benefits
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { val: '1', label: '1 Month Free', sub: '100% 12th Month' },
                        { val: '2', label: '2 Months Free', sub: 'For 24m Plans' },
                        { val: '0.5', label: '50% Bonus', sub: 'Half Month Free' },
                        { val: '0', label: 'Standard', sub: 'No Bonus' },
                      ].map(b => (
                        <button
                          key={b.val}
                          type="button"
                          onClick={() => setBonusMonths(b.val)}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            bonusMonths === b.val
                              ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/40 shadow-sm'
                              : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
                          }`}
                        >
                          <p className="text-xs font-bold text-foreground">{b.label}</p>
                          <p className="text-[10px] text-muted-foreground">{b.sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Section 5: Gifts & Perks */}
                  <div className="space-y-4 pt-2 border-t border-border/60">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Gift className="h-3.5 w-3.5" /> 5. Gift & Value Benefits
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'gold_coin', label: 'Gold Coin', icon: Coins, text: '1g 24K Gold Coin' },
                        { id: 'silver_lamp', label: 'Silver Item', icon: Award, text: '10g Silver Lamp' },
                        { id: 'voucher', label: 'Gift Voucher', icon: Ticket, text: '₹2,000 Purchase Voucher' },
                        { id: 'making_charges', label: '0% Making', icon: Tag, text: '100% Free Making Charges' },
                      ].map(g => {
                        const IconG = g.icon
                        const isSel = giftPreset === g.id
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setGiftPreset(g.id)}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all gap-1 ${
                              isSel
                                ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/40 shadow-sm'
                                : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
                            }`}
                          >
                            <IconG className={`h-4 w-4 ${isSel ? 'text-amber-500' : 'text-muted-foreground'}`} />
                            <span className="text-xs font-bold">{g.label}</span>
                            <span className="text-[9px] text-muted-foreground truncate max-w-full">{g.text}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Section 6: Terms Clauses */}
                  <div className="space-y-3 pt-2 border-t border-border/60">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <ScrollText className="h-3.5 w-3.5" /> 6. Terms & Conditions Clauses
                    </h3>

                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTermsAndConditions(
                          '1. Monthly deposits are converted to 22K gold weight based on prevailing daily gold rate.\n2. Customer accumulates gold grams month-by-month protecting against gold price inflation.\n3. Store bonus 12th month benefit credited on 11 consecutive timely payments.\n4. Accumulated gold grams redeemable for 22K/24K gold jewelry at maturity.'
                        )}
                        className="px-2.5 py-1 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] font-bold hover:bg-amber-500/20 transition-all"
                      >
                        ⚖️ Gold Weight Linked Terms
                      </button>
                      <button
                        type="button"
                        onClick={() => setTermsAndConditions(
                          '1. Monthly dues must be deposited on or before the due date each month.\n2. Gold weight credited on maturity based on prevailing 22K daily rate.\n3. Store bonus 12th month benefit granted after 11 consecutive timely payments.\n4. Gift voucher / coin redeemable at any DigiGold store branch.'
                        )}
                        className="px-2.5 py-1 rounded-lg border border-border bg-muted/40 text-[11px] font-bold hover:bg-muted text-foreground transition-all"
                      >
                        📜 Standard Cash Terms
                      </button>
                    </div>

                    <Textarea
                      placeholder="Enter official terms & conditions clauses for this chit scheme plan..."
                      value={termsAndConditions}
                      onChange={(e) => setTermsAndConditions(e.target.value)}
                      rows={3}
                      className="text-xs font-medium border-amber-500/30 focus:border-amber-500 leading-relaxed"
                    />
                  </div>

                  {/* Section 7: Live Simulator Preview */}
                  <div className="pt-2 border-t border-border/60">
                    <Label className="text-xs font-bold text-muted-foreground mb-2 block flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-amber-500" /> Customer App Card Live Preview
                    </Label>
                    <div className="p-4 rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-background shadow-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-heading font-extrabold text-base text-foreground">
                              {name || (schemeType === 'gold_rate_linked' ? 'Swarna Gold Weight Saver' : 'Swarna Fixed Chit Plan')}
                            </h4>
                            <Badge variant="outline" className="text-[9px] border-amber-500/40 font-bold text-amber-600 dark:text-amber-400">
                              {schemeType === 'gold_rate_linked' ? '⚖️ Gold Rate Linked' : '💵 Cash Plan'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {description || 'Accumulate gold weight at daily rates with bonus store contribution'}
                          </p>
                        </div>
                        <Badge className="bg-amber-500 text-white text-[10px] font-bold">
                          {durationMonths || 11} Months
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-card border border-border/60 text-xs">
                        <div>
                          <p className="text-[9px] font-bold uppercase text-muted-foreground">Monthly</p>
                          <p className="font-extrabold text-foreground">{formatINR(parseFloat(minInstallment) || 1000)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase text-muted-foreground">Bonus Benefit</p>
                          <p className="font-extrabold text-emerald-600 dark:text-emerald-400">
                            {parseFloat(bonusMonths) > 0 ? `${bonusMonths} Month Free` : 'Standard'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase text-muted-foreground">Est. Total Gold</p>
                          <p className="font-extrabold text-amber-600 dark:text-amber-400">
                            {schemeType === 'gold_rate_linked' ? `≈ ${estTotalGrams.toFixed(2)}g (22K)` : formatINR((parseFloat(minInstallment) || 1000) * (parseInt(durationMonths) || 11))}
                          </p>
                        </div>
                      </div>

                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                        <Gift className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">Bonus Gift: {previewGiftText}</span>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="pt-3 border-t border-border">
                    <Button type="button" variant="outline" size="sm" onClick={() => setOpenAdd(false)}>
                      Cancel
                    </Button>
                    <GoldButton type="submit" size="sm" disabled={addSchemeMutation.isPending} className="gap-2 shadow-lg">
                      {addSchemeMutation.isPending ? 'Creating Scheme...' : 'Publish Jewelry Scheme'}
                    </GoldButton>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* ── TOOLBAR: MINIMAL FILTER & SEARCH ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search schemes or perks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs rounded-xl border-border/80 focus:border-amber-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Plans', count: schemes.length },
            { id: 'gold_rate_linked', label: '⚖️ Gold Rate Linked', count: goldRateLinkedCount },
            { id: 'fixed', label: '💵 Cash Plans', count: schemes.length - goldRateLinkedCount },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                filterType === f.id
                  ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                  : 'bg-card text-muted-foreground border-border/80 hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <span>{f.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                filterType === f.id ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── REDESIGNED PREMIUM SCHEME CARDS GRID ──────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-80 rounded-3xl bg-muted/40 animate-pulse border border-border/60" />
          ))}
        </div>
      ) : filteredSchemes.length === 0 ? (
        <Card className="p-12 text-center space-y-3 rounded-3xl border-dashed border-2 border-border">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <Layers className="h-6 w-6" />
          </div>
          <h3 className="font-heading text-lg font-bold text-foreground">No Chit Schemes Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No active chit scheme plans match your search or filter selection.
          </p>
          <Button variant="outline" size="sm" onClick={() => { setSearch(''); setFilterType('all'); }}>
            Reset Filters
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSchemes.map((scheme, idx) => {
            const isGoldLinked = scheme.scheme_type === 'gold_rate_linked' || scheme.description?.includes('[Gold Weight Based]')
            const descParts = scheme.description ? scheme.description.split('[Terms & Conditions]') : []
            const mainDesc = descParts[0]?.replace(/\[Gold Weight Based\]|\[Fixed Cash Value\]/g, '').trim() || 'Jewelry Chit Savings Plan'
            const tcText = descParts[1]?.trim() || ''

            const isTcExpanded = expandedTcId === scheme.id
            const isActive = scheme.is_active !== false

            // Calculations
            const monthlyAmt = scheme.min_installment || 0
            const duration = scheme.duration_months || 11
            const estGramsPerMonth = monthlyAmt / today22kRate
            const estAccumulatedGrams = estGramsPerMonth * duration

            return (
              <motion.div
                key={scheme.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ y: -4 }}
                className="h-full"
              >
                <Card className={`relative overflow-hidden rounded-3xl border-2 transition-all duration-300 p-6 flex flex-col justify-between h-full backdrop-blur-sm ${
                  isActive
                    ? 'border-amber-500/30 bg-gradient-to-b from-card via-card to-amber-500/5 hover:border-amber-500/60 hover:shadow-2xl hover:shadow-amber-500/10'
                    : 'border-border/60 bg-muted/20 opacity-75'
                }`}>
                  {/* Top Ambient Glow Accent */}
                  <div className="absolute top-0 right-0 -mt-6 -mr-6 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

                  <div className="space-y-5">
                    {/* Header: Title & Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-heading text-lg font-extrabold text-foreground tracking-tight">
                            {scheme.name}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {mainDesc}
                        </p>
                      </div>

                      {/* Active Status Badge */}
                      <button
                        onClick={() => toggleActiveMutation.mutate({ id: scheme.id, is_active: !isActive })}
                        disabled={toggleActiveMutation.isPending}
                        className="shrink-0"
                        title="Click to toggle plan status"
                      >
                        <Badge
                          variant={isActive ? "gold" : "outline"}
                          className={`cursor-pointer transition-all gap-1 text-[10px] font-bold px-2.5 py-0.5 ${
                            isActive
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                              : 'text-muted-foreground border-border hover:bg-muted'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
                          {isActive ? 'Active Plan' : 'Inactive'}
                        </Badge>
                      </button>
                    </div>

                    {/* Model Badge Tag */}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] font-extrabold gap-1 py-0.5 px-2.5 ${
                        isGoldLinked
                          ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                          : 'border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400'
                      }`}>
                        {isGoldLinked ? (
                          <><Scale className="h-3 w-3 text-amber-500" /> ⚖️ Gold Rate Linked</>
                        ) : (
                          <><Landmark className="h-3 w-3 text-blue-500" /> 💵 Cash Value Plan</>
                        )}
                      </Badge>
                    </div>

                    {/* Key Plan Metrics Card */}
                    <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-card border border-border/80 shadow-sm text-xs">
                      <div>
                        <p className="text-[10px] font-extrabold uppercase text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-amber-500" /> Plan Term
                        </p>
                        <p className="font-extrabold text-foreground text-sm mt-0.5">{scheme.duration_months} Months</p>
                      </div>

                      <div>
                        <p className="text-[10px] font-extrabold uppercase text-muted-foreground flex items-center gap-1">
                          <Coins className="h-3 w-3 text-amber-500" /> Installment
                        </p>
                        <p className="font-extrabold text-foreground text-sm mt-0.5">{formatINR(scheme.min_installment)}<span className="text-[10px] text-muted-foreground font-normal">/mo</span></p>
                      </div>

                      <div className="col-span-2 pt-2 border-t border-border/60 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-extrabold uppercase text-muted-foreground flex items-center gap-1">
                            <Zap className="h-3 w-3 text-amber-500" /> Store Bonus
                          </p>
                          <p className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs mt-0.5">
                            {scheme.bonus_months > 0 ? `🎁 ${scheme.bonus_months} Month Free` : 'Standard Plan'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-extrabold uppercase text-muted-foreground">
                            {isGoldLinked ? 'Est. Total Gold' : 'Total Maturity'}
                          </p>
                          <p className="font-extrabold text-amber-600 dark:text-amber-400 text-xs mt-0.5">
                            {isGoldLinked ? `≈ ${estAccumulatedGrams.toFixed(2)}g 22K` : formatINR(monthlyAmt * duration)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bonus Gift Description */}
                    {scheme.gift_description && (
                      <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-2.5 shadow-sm">
                        <div className="h-7 w-7 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                          <Gift className="h-4 w-4 text-amber-500" />
                        </div>
                        <span className="text-xs leading-snug">{scheme.gift_description}</span>
                      </div>
                    )}
                  </div>

                  {/* Terms & Conditions Accordion Drawer */}
                  {tcText && (
                    <div className="pt-4 mt-4 border-t border-border/60">
                      <button
                        type="button"
                        onClick={() => setExpandedTcId(isTcExpanded ? null : scheme.id)}
                        className="w-full flex items-center justify-between text-xs font-extrabold text-amber-600 dark:text-amber-400 hover:text-amber-500 transition-colors py-1"
                      >
                        <span className="flex items-center gap-1.5">
                          <ScrollText className="h-3.5 w-3.5" /> Terms &amp; Conditions Clauses
                        </span>
                        {isTcExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>

                      <AnimatePresence>
                        {isTcExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="p-3 bg-muted/60 rounded-xl text-[11px] font-sans text-muted-foreground whitespace-pre-line border border-border/80 mt-2 leading-relaxed"
                          >
                            {tcText}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

