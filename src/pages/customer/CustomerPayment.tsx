import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { CustomerChit, Scheme } from '@/types/database'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GoldButton } from '@/components/ui/gold-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatINR } from '@/lib/utils'
import {
  CreditCard, ArrowLeft, CheckCircle2,
  Layers, QrCode, Building2, Banknote, ShieldCheck
} from 'lucide-react'
import { toast } from 'sonner'

export const CustomerPayment: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const initialChitId = searchParams.get('chitId') || ''

  const [selectedChitId, setSelectedChitId] = useState<string>(initialChitId)
  const [payAmount, setPayAmount] = useState<string>('')
  const [payMode, setPayMode] = useState<'upi' | 'bank_transfer' | 'cheque' | 'cash'>('upi')
  const [payNotes, setPayNotes] = useState<string>('')

  // Fetch customer active enrolled chits
  const { data: myChits = [], isLoading } = useQuery({
    queryKey: ['my-chits-payment-page', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_chits')
        .select('*, scheme:chit_schemes(*), payments(*)')
        .eq('customer_id', user!.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as (CustomerChit & { scheme?: Scheme; payments?: any[] })[]
    },
    enabled: !!user?.id,
  })

  // Auto-select first chit if none selected
  useEffect(() => {
    if (myChits.length > 0 && !selectedChitId) {
      const first = myChits[0]
      setSelectedChitId(first.id)
      setPayAmount(first.agreed_amount ? first.agreed_amount.toString() : '5000')
    }
  }, [myChits, selectedChitId])

  const selectedChit = myChits.find(c => c.id === selectedChitId)

  // Update pay amount when selected chit changes
  const handleSelectChit = (chit: CustomerChit & { scheme?: Scheme }) => {
    setSelectedChitId(chit.id)
    setPayAmount(chit.agreed_amount ? chit.agreed_amount.toString() : '5000')
  }

  // Payment mutation
  const payMutation = useMutation({
    mutationFn: async () => {
      if (!selectedChit || !user) throw new Error('Please select an active scheme plan')
      const amountVal = selectedChit.agreed_amount || parseFloat(payAmount) || 0
      if (!amountVal || amountVal <= 0) throw new Error('Invalid payment amount')

      const todayStr = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('payments')
        .insert({
          customer_chit_id: selectedChit.id,
          customer_id: user.id,
          amount: amountVal,
          payment_date: todayStr,
          payment_mode: payMode,
          notes: payNotes || `Online Scheme Payment for ${selectedChit.scheme?.name || 'Gold Chit'}`,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success(`🎉 Payment of ${formatINR(parseFloat(payAmount))} Recorded Successfully!`)
      queryClient.invalidateQueries({ queryKey: ['my-chits-passbook'] })
      queryClient.invalidateQueries({ queryKey: ['my-passbook-all-payments'] })
      queryClient.invalidateQueries({ queryKey: ['my-chits'] })
      navigate('/customer/passbook')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Payment failed. Please try again.')
    },
  })

  return (
    <div className="space-y-6 pb-8 max-w-xl mx-auto">
      {/* Top Navigation Back Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate(-1)}
          className="h-9 w-9 rounded-xl border-border shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-heading text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-amber-500" /> Pay Scheme Installment
          </h1>
          <p className="text-xs text-muted-foreground">
            Complete your monthly scheme deposit securely
          </p>
        </div>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center text-xs text-muted-foreground">Loading active schemes...</Card>
      ) : myChits.length === 0 ? (
        <Card className="p-8 text-center space-y-3">
          <Layers className="h-10 w-10 text-amber-500/50 mx-auto" />
          <p className="font-bold text-sm text-foreground">No active enrolled schemes</p>
          <p className="text-xs text-muted-foreground">You do not have any active scheme enrolled yet to make a payment.</p>
          <Link to="/customer/schemes">
            <GoldButton className="text-xs font-bold px-4 py-2 mt-2">
              Browse &amp; Enroll in Scheme
            </GoldButton>
          </Link>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* 1. Select Active Scheme */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              1. Select Active Scheme Plan
            </Label>
            <div className="grid grid-cols-1 gap-2.5">
              {myChits.map(chit => {
                const isSelected = chit.id === selectedChitId
                const paidCount = chit.payments?.length || 0
                const totalMonths = chit.scheme?.duration_months || 11

                return (
                  <div
                    key={chit.id}
                    onClick={() => handleSelectChit(chit)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20 shadow-sm'
                        : 'border-border/70 bg-card hover:border-amber-500/30'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-foreground truncate">
                          {chit.scheme?.name || 'Gold Savings Scheme'}
                        </span>
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[9px] uppercase font-black px-1.5 py-0">
                          Active
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Progress: <strong className="text-foreground font-semibold">{paidCount}/{totalMonths} Months</strong> • Due Day {chit.monthly_due_day}th
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
                        {formatINR(chit.agreed_amount)}<span className="text-[10px] font-normal text-muted-foreground">/mo</span>
                      </p>
                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 text-amber-500 ml-auto mt-1" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 2. Fixed Installment Amount (Read Only) */}
          {selectedChit && (
            <Card className="p-4 border-amber-500/20 bg-gradient-to-br from-card to-amber-500/5 space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  2. Fixed Monthly Installment (₹)
                </Label>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> Locked Agreed Amount
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-2.5 font-extrabold text-sm text-muted-foreground">₹</span>
                <Input
                  type="text"
                  value={selectedChit.agreed_amount ? selectedChit.agreed_amount.toString() : '0'}
                  readOnly
                  disabled
                  className="pl-8 h-11 text-base font-extrabold text-amber-600 dark:text-amber-400 bg-muted/40 rounded-xl border-amber-500/30 cursor-not-allowed shadow-xs select-none"
                />
                <div className="absolute right-3.5 top-2.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30 uppercase">
                  Locked
                </div>
              </div>
            </Card>
          )}

          {/* 3. Select Payment Method */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              3. Select Payment Method
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'upi', label: 'UPI / QR Scan', desc: 'GPay, PhonePe, Paytm', icon: QrCode },
                { id: 'bank_transfer', label: 'Net Banking', desc: 'Bank Transfer / IMPS', icon: Building2 },
                { id: 'cheque', label: 'Card Payment', desc: 'Credit / Debit Card', icon: CreditCard },
                { id: 'cash', label: 'Cash at Store', desc: 'Branch Deposit', icon: Banknote },
              ].map(method => {
                const Icon = method.icon
                const isSelected = payMode === method.id

                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPayMode(method.id as any)}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20 shadow-xs'
                        : 'border-border/70 bg-card hover:border-amber-500/30'
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-xs text-foreground truncate">{method.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{method.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 4. Notes / Reference Input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-muted-foreground">
              4. Transaction Reference / Notes (Optional)
            </Label>
            <Input
              value={payNotes}
              onChange={e => setPayNotes(e.target.value)}
              placeholder="e.g. UTR / Transaction Reference #123456"
              className="h-10 text-xs rounded-xl bg-card border-border/70"
            />
          </div>

          {/* 5. Submit Button - Centered */}
          <div className="pt-2 flex justify-center items-center">
            <GoldButton
              disabled={payMutation.isPending || !selectedChit}
              onClick={() => payMutation.mutate()}
              className="w-full max-w-xs h-12 text-base font-extrabold gap-2 rounded-2xl shadow-lg justify-center mx-auto"
            >
              <ShieldCheck className="h-5 w-5" />
              {payMutation.isPending
                ? 'Processing...'
                : `Pay ${formatINR(selectedChit?.agreed_amount || 0)}`}
            </GoldButton>
          </div>
        </div>
      )}
    </div>
  )
}
