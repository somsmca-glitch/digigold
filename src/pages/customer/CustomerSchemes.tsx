import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Scheme } from '@/types/database'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GoldButton } from '@/components/ui/gold-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { formatINR } from '@/lib/utils'
import { Sparkles, Gift, Calendar } from 'lucide-react'

export const CustomerSchemes: React.FC = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null)
  const [agreedAmount, setAgreedAmount] = useState<string>('')
  const [dueDay, setDueDay] = useState<string>('10')

  const { data: schemes = [] } = useQuery<Scheme[]>({
    queryKey: ['active-schemes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chit_schemes').select('*').eq('is_active', true)
      if (error) throw error
      return (data as Scheme[]) ?? []
    },
  })

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!selectedScheme || !user) throw new Error('User or scheme not selected')

      const today = new Date()
      const startDateStr = today.toISOString().split('T')[0]
      const maturity = new Date(today)
      maturity.setMonth(maturity.getMonth() + selectedScheme.duration_months)

      const { data, error } = await supabase.from('customer_chits').insert({
        customer_id: user.id,
        scheme_id: selectedScheme.id,
        start_date: startDateStr,
        maturity_date: maturity.toISOString().split('T')[0],
        monthly_due_day: parseInt(dueDay),
        agreed_amount: parseFloat(agreedAmount) || selectedScheme.min_installment,
        status: 'active',
      }).select().single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Successfully enrolled in scheme!')
      queryClient.invalidateQueries({ queryKey: ['my-chits'] })
      setSelectedScheme(null)
      setAgreedAmount('')
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Enrollment failed')
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    enrollMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Jewelry Saving Plans</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Pay monthly installments & get bonus gold jewelry at maturity!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {schemes.map((scheme: Scheme) => (
          <Card key={scheme.id} className="p-6 relative border-amber-500/30 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-heading text-xl font-bold text-foreground">{scheme.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{scheme.description || 'Flexible Monthly Gold Chit'}</p>
              </div>
              <Badge variant="gold">
                {scheme.bonus_months > 0 ? `${scheme.bonus_months} Mo Free` : 'Bonus'}
              </Badge>
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-amber-500" /> Plan Duration
                </span>
                <span className="font-bold text-foreground">{scheme.duration_months} Months</span>
              </div>

              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Min Monthly Due
                </span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{formatINR(scheme.min_installment)}/mo</span>
              </div>

              {scheme.gift_description && (
                <div className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 font-medium flex items-center gap-2">
                  <Gift className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>Bonus Gift: {scheme.gift_description}</span>
                </div>
              )}
            </div>

            <GoldButton
              className="w-full mt-6 py-2.5"
              onClick={() => {
                setSelectedScheme(scheme)
                setAgreedAmount(scheme.min_installment.toString())
              }}
            >
              Enroll Now
            </GoldButton>
          </Card>
        ))}
      </div>

      {/* Enrollment Modal */}
      <Dialog open={!!selectedScheme} onOpenChange={() => setSelectedScheme(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll in {selectedScheme?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Monthly Agreed Amount (₹)</Label>
              <Input
                type="number"
                min={selectedScheme?.min_installment}
                step="500"
                value={agreedAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAgreedAmount(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Minimum: {formatINR(selectedScheme?.min_installment)}</p>
            </div>

            <div className="space-y-2">
              <Label>Preferred Monthly Due Day</Label>
              <Input
                type="number"
                min={1}
                max={28}
                value={dueDay}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDueDay(e.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSelectedScheme(null)}>
                Cancel
              </Button>
              <GoldButton type="submit" disabled={enrollMutation.isPending}>
                {enrollMutation.isPending ? 'Enrolling...' : 'Confirm & Start Saving'}
              </GoldButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
