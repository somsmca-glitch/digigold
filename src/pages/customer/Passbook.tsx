import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Payment } from '@/types/database'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatINR, formatDate } from '@/lib/utils'
import { BookOpen, CheckCircle2 } from 'lucide-react'

export const Passbook: React.FC = () => {
  const { user } = useAuth()

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['my-passbook', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', user!.id)
        .order('payment_date', { ascending: false })
      if (error) throw error
      return data as Payment[]
    },
    enabled: !!user?.id,
  })

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Digital Passbook</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your official record of all gold chit payments</p>
      </div>

      <Card className="p-6 bg-gradient-to-br from-amber-500/10 via-yellow-500/10 to-amber-600/10 border-amber-500/30">
        <span className="text-xs text-muted-foreground uppercase font-medium">Total Accumulated Savings</span>
        <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">{formatINR(totalPaid)}</div>
        <p className="text-xs text-muted-foreground mt-1">Across {payments.length} successful transactions</p>
      </Card>

      <Card>
        <div className="p-4 border-b border-border font-semibold flex items-center justify-between">
          <span className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-amber-500" /> Payment Receipts
          </span>
          <Badge variant="outline">{payments.length} Entries</Badge>
        </div>

        <div className="divide-y divide-border">
          {payments.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">No payment records found.</p>
          ) : (
            payments.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between text-sm hover:bg-muted/30">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="font-bold text-foreground">{formatINR(p.amount)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">
                    Paid via {p.payment_mode} • {p.notes || 'Installment'}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(p.payment_date)}</span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
