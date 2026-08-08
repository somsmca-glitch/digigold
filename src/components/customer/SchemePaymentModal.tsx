import React, { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { CustomerChit, Scheme } from '@/types/database'
import { Button } from '@/components/ui/button'
import { GoldButton } from '@/components/ui/gold-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatINR } from '@/lib/utils'
import {
  CreditCard, ShieldCheck, QrCode, Building2, Banknote, X, Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

interface SchemePaymentModalProps {
  chit: (CustomerChit & { scheme?: Scheme; payments?: any[] }) | null
  onClose: () => void
}

export const SchemePaymentModal: React.FC<SchemePaymentModalProps> = ({ chit, onClose }) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [payAmount, setPayAmount] = useState<string>('')
  const [payMode, setPayMode] = useState<'upi' | 'bank_transfer' | 'cheque' | 'cash'>('upi')
  const [payNotes, setPayNotes] = useState<string>('')

  // Pre-fill agreed amount when chit opens
  useEffect(() => {
    if (chit) {
      setPayAmount(chit.agreed_amount ? chit.agreed_amount.toString() : '5000')
      setPayMode('upi')
      setPayNotes('')
    }
  }, [chit])

  // Payment mutation
  const payMutation = useMutation({
    mutationFn: async () => {
      if (!chit || !user) throw new Error('Invalid scheme selection')
      const amountVal = chit.agreed_amount || parseFloat(payAmount) || 0
      if (!amountVal || amountVal <= 0) throw new Error('Invalid deposit amount')

      const todayStr = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('payments')
        .insert({
          customer_chit_id: chit.id,
          customer_id: user.id,
          amount: amountVal,
          payment_date: todayStr,
          payment_mode: payMode,
          notes: payNotes || `Online Scheme Payment for ${chit.scheme?.name || 'Gold Chit'}`,
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
      onClose()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Payment failed')
    },
  })

  const paidCount = chit?.payments?.length || 0
  const totalMonths = chit?.scheme?.duration_months || 11

  return (
    <AnimatePresence>
      {chit && (
        <>
          {/* ── Native Backdrop Overlay with Fade Animation ── */}
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
            {/* Android Top Drag Pill Handle */}
            <div className="pt-3 pb-1 flex justify-center shrink-0 cursor-grab active:cursor-grabbing" onClick={onClose}>
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/35 hover:bg-amber-500/50 transition-colors" />
            </div>

            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-500 shrink-0 shadow-xs">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-extrabold text-foreground leading-tight truncate">
                    Pay Scheme Installment
                  </h2>
                  <p className="text-xs text-muted-foreground font-medium truncate">
                    {chit.scheme?.name || 'Gold Savings Scheme'}
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

            {/* Scrollable Content Body (Hidden Scrollbar) */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {/* Pre-Selected Scheme Summary Box with Native Android Glow */}
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-transparent border border-amber-500/35 flex items-center justify-between gap-3 shadow-xs relative overflow-hidden"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs sm:text-sm text-foreground truncate">
                      {chit.scheme?.name}
                    </span>
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[9px] uppercase font-black px-1.5 py-0 shrink-0">
                      Active Plan
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Progress: <strong className="text-foreground">{paidCount} of {totalMonths} Months</strong> • Due: {chit.monthly_due_day || 5}th
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Agreed Monthly</p>
                  <p className="text-base sm:text-lg font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                    {formatINR(chit.agreed_amount)}
                  </p>
                </div>
              </motion.div>

              {/* Deposit Amount (Fixed Agreed Amount - Read Only) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Monthly Installment Amount (₹)
                  </Label>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" /> Fixed Agreed Amount
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-3 font-extrabold text-sm text-muted-foreground">₹</span>
                  <Input
                    type="text"
                    value={chit.agreed_amount ? chit.agreed_amount.toString() : '0'}
                    readOnly
                    disabled
                    className="pl-8 h-12 text-base font-extrabold text-amber-600 dark:text-amber-400 bg-muted/40 rounded-2xl border-amber-500/30 cursor-not-allowed shadow-xs select-none"
                  />
                  <div className="absolute right-3.5 top-3 text-[10px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30 uppercase">
                    Locked
                  </div>
                </div>
              </div>

              {/* Select Payment Method */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Select Payment Method
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
                        className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20 shadow-xs scale-[1.01]'
                            : 'border-border/70 bg-card hover:border-amber-500/30'
                        }`}
                      >
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-amber-500 text-white shadow-xs' : 'bg-muted text-muted-foreground'
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-[11px] text-foreground truncate">{method.label}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{method.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Transaction Reference / Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground">
                  Transaction Reference / Notes (Optional)
                </Label>
                <Input
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  placeholder="e.g. UTR / Transaction Reference #123456"
                  className="h-10 text-xs rounded-xl bg-background border-border/70"
                />
              </div>
            </div>

            {/* Bottom Action Bar - Centered */}
            <div className="pt-3 pb-[calc(16px+env(safe-area-inset-bottom,0px))] border-t border-border/50 shrink-0 flex justify-center items-center px-4 bg-card/95">
              <GoldButton
                disabled={payMutation.isPending}
                onClick={() => payMutation.mutate()}
                className="w-full max-w-xs h-12 text-base font-extrabold gap-2 rounded-2xl shadow-xl justify-center mx-auto"
              >
                <ShieldCheck className="h-5 w-5" />
                {payMutation.isPending
                  ? 'Processing...'
                  : `Pay ${formatINR(chit.agreed_amount || 0)}`}
              </GoldButton>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
