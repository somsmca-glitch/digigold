import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Reminder, Customer } from '@/types/database'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
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
import { formatDate } from '@/lib/utils'
import { Bell, Send, MessageSquare, PhoneCall } from 'lucide-react'

export const RemindersPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [openSend, setOpenSend] = useState(false)

  const [customerId, setCustomerId] = useState('')
  const [channel, setChannel] = useState<'whatsapp' | 'sms' | 'manual'>('whatsapp')
  const [message, setMessage] = useState('Dear Customer, your monthly chit installment payment is due. Kindly pay at your earliest convenience. Thank you!')

  const { data: reminders = [] } = useQuery({
    queryKey: ['reminders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminders')
        .select('*, customer:customers(*)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as (Reminder & { customer?: Customer })[]
    },
  })

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*')
      if (error) throw error
      return data as Customer[]
    },
  })

  const sendReminderMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from('reminders').insert({
        customer_id: customerId,
        channel,
        message,
        status: 'sent',
        sent_at: new Date().toISOString(),
      }).select().single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Reminder sent & logged successfully!')
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      setOpenSend(false)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to send reminder')
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Payment Reminders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Send WhatsApp & SMS due notices to members</p>
        </div>

        <Dialog open={openSend} onOpenChange={setOpenSend}>
          <DialogTrigger asChild>
            <GoldButton>
              <Send className="h-4 w-4 mr-2" /> Send New Reminder
            </GoldButton>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Due Reminder</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                sendReminderMutation.mutate()
              }}
              className="space-y-4 py-2"
            >
              <div className="space-y-2">
                <Label>Select Member</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Channel</Label>
                <Select value={channel} onValueChange={(v: any) => setChannel(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp Message</SelectItem>
                    <SelectItem value="sms">SMS Text</SelectItem>
                    <SelectItem value="manual">Manual Call Log</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Message Content</Label>
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              <DialogFooter>
                <GoldButton type="submit" disabled={sendReminderMutation.isPending || !customerId}>
                  {sendReminderMutation.isPending ? 'Sending...' : 'Send Reminder'}
                </GoldButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sent Reminder Logs ({reminders.length})</CardTitle>
        </CardHeader>
        <div className="divide-y divide-border">
          {reminders.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No reminders sent yet.</p>
          ) : (
            reminders.map((r) => (
              <div key={r.id} className="p-4 flex items-center justify-between text-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{r.customer?.name ?? 'Customer'}</span>
                    <Badge variant="outline" className="capitalize text-xs">
                      {r.channel}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{r.message}</p>
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
