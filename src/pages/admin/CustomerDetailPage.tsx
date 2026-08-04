import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Customer, CustomerChit, Payment, Scheme } from '@/types/database'
import { Button } from '@/components/ui/button'
import { GoldButton } from '@/components/ui/gold-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { formatINR, formatDate, getInitials } from '@/lib/utils'
import { ArrowLeft, Phone, MapPin, Plus, IndianRupee, Layers, Calendar, CheckCircle2 } from 'lucide-react'

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [openPayment, setOpenPayment] = useState(false)
  const [openEnroll, setOpenEnroll] = useState(false)

  // Payment Form
  const [selectedChitId, setSelectedChitId] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'bank_transfer' | 'cheque'>('upi')
  const [notes, setNotes] = useState('')

  // Enroll Form
  const [schemeId, setSchemeId] = useState('')
  const [agreedAmount, setAgreedAmount] = useState('')
  const [dueDay, setDueDay] = useState('10')

  // Fetch Customer
  const { data: customer, isLoading: loadingCustomer } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*').eq('id', id!).single()
      if (error) throw error
      return data as Customer
    },
    enabled: !!id,
  })

  // Fetch Chits
  const { data: chits = [], isLoading: loadingChits } = useQuery({
    queryKey: ['customer-chits', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_chits')
        .select('*, scheme:chit_schemes(*)')
        .eq('customer_id', id!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as (CustomerChit & { scheme?: Scheme })[]
    },
    enabled: !!id,
  })

  // Fetch Payments
  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['customer-payments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('customer_id', id!)
        .order('payment_date', { ascending: false })
      if (error) throw error
      return data as Payment[]
    },
    enabled: !!id,
  })

  // Fetch Active Schemes for Enrollment
  const { data: schemes = [] } = useQuery({
    queryKey: ['schemes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chit_schemes').select('*').eq('is_active', true)
      if (error) throw error
      return data as Scheme[]
    },
  })

  // Record Payment Mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from('payments').insert({
        customer_id: id!,
        customer_chit_id: selectedChitId,
        amount: parseFloat(payAmount),
        payment_mode: paymentMode,
        payment_date: new Date().toISOString().split('T')[0],
        notes,
      }).select().single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Payment recorded successfully!')
      queryClient.invalidateQueries({ queryKey: ['customer-payments', id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] })
      setOpenPayment(false)
      setPayAmount('')
      setNotes('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to record payment')
    },
  })

  // Enroll Scheme Mutation
  const enrollSchemeMutation = useMutation({
    mutationFn: async () => {
      const scheme = schemes.find((s) => s.id === schemeId)
      if (!scheme) throw new Error('Selected scheme not found')

      const today = new Date()
      const startDateStr = today.toISOString().split('T')[0]
      const maturity = new Date(today)
      maturity.setMonth(maturity.getMonth() + scheme.duration_months)

      const { data, error } = await supabase.from('customer_chits').insert({
        customer_id: id!,
        scheme_id: schemeId,
        start_date: startDateStr,
        maturity_date: maturity.toISOString().split('T')[0],
        monthly_due_day: parseInt(dueDay),
        agreed_amount: parseFloat(agreedAmount) || scheme.min_installment,
        status: 'active',
      }).select().single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Enrolled in scheme successfully!')
      queryClient.invalidateQueries({ queryKey: ['customer-chits', id] })
      setOpenEnroll(false)
      setAgreedAmount('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to enroll in scheme')
    },
  })

  if (loadingCustomer) {
    return <Skeleton className="h-96 w-full" />
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link to="/admin/customers">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Customers
        </Button>
      </Link>

      {/* Customer Overview Header */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={customer?.photo_url ?? undefined} />
              <AvatarFallback className="bg-amber-500/10 text-amber-600 font-bold text-xl">
                {getInitials(customer?.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-heading text-2xl font-bold">{customer?.name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> {customer?.phone}
                </span>
                {customer?.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {customer.city}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Dialog open={openEnroll} onOpenChange={setOpenEnroll}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Layers className="h-4 w-4 mr-2" /> Enroll Scheme
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Enroll in New Scheme</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    enrollSchemeMutation.mutate()
                  }}
                  className="space-y-4 py-2"
                >
                  <div className="space-y-2">
                    <Label>Select Scheme</Label>
                    <Select value={schemeId} onValueChange={setSchemeId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose scheme plan..." />
                      </SelectTrigger>
                      <SelectContent>
                        {schemes.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({s.duration_months}m - Min {formatINR(s.min_installment)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Monthly Agreed Amount (₹)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 5000"
                      value={agreedAmount}
                      onChange={(e) => setAgreedAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Monthly Due Day</Label>
                    <Input
                      type="number"
                      min={1}
                      max={28}
                      value={dueDay}
                      onChange={(e) => setDueDay(e.target.value)}
                      required
                    />
                  </div>
                  <DialogFooter>
                    <GoldButton type="submit" disabled={enrollSchemeMutation.isPending}>
                      {enrollSchemeMutation.isPending ? 'Enrolling...' : 'Confirm Enrollment'}
                    </GoldButton>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={openPayment} onOpenChange={setOpenPayment}>
              <DialogTrigger asChild>
                <GoldButton>
                  <IndianRupee className="h-4 w-4 mr-2" /> Record Payment
                </GoldButton>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Installment Payment</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    recordPaymentMutation.mutate()
                  }}
                  className="space-y-4 py-2"
                >
                  <div className="space-y-2">
                    <Label>Select Active Chit Plan</Label>
                    <Select value={selectedChitId} onValueChange={setSelectedChitId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select enrolled chit..." />
                      </SelectTrigger>
                      <SelectContent>
                        {chits.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.scheme?.name ?? 'Scheme'} (Due: Day {c.monthly_due_day})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (₹)</Label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Mode</Label>
                    <Select value={paymentMode} onValueChange={(v: any) => setPaymentMode(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upi">UPI / GPay / PhonePe</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes / Receipt No</Label>
                    <Input
                      placeholder="Optional receipt notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <GoldButton type="submit" disabled={recordPaymentMutation.isPending}>
                      {recordPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
                    </GoldButton>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </Card>

      {/* Enrolled Chits Section */}
      <div>
        <h2 className="font-heading text-lg font-bold mb-3">Active Chit Plans ({chits.length})</h2>
        {chits.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            No active chit plans. Click "Enroll Scheme" above to get started.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {chits.map((chit) => (
              <Card key={chit.id} className="p-4 border-amber-500/20">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-base">{chit.scheme?.name ?? 'Chit Plan'}</h3>
                  <Badge variant={chit.status === 'active' ? 'gold' : 'secondary'} className="capitalize">
                    {chit.status}
                  </Badge>
                </div>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <p>Agreed Installment: <span className="font-semibold text-foreground">{formatINR(chit.agreed_amount)}</span></p>
                  <p>Monthly Due Day: <span className="font-semibold text-foreground">Day {chit.monthly_due_day}</span></p>
                  <p>Maturity Date: <span className="font-semibold text-foreground">{formatDate(chit.maturity_date)}</span></p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Payment History Section */}
      <div>
        <h2 className="font-heading text-lg font-bold mb-3">Payment History ({payments.length})</h2>
        {payments.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">No payment records yet.</Card>
        ) : (
          <Card>
            <div className="divide-y divide-border">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4 text-sm">
                  <div>
                    <p className="font-semibold text-foreground">{formatINR(p.amount)}</p>
                    <p className="text-xs text-muted-foreground uppercase mt-0.5">{p.payment_mode} • {p.notes || 'Monthly Due'}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(p.payment_date)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
