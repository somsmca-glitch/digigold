import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Reminder, Customer, CustomerChit, Scheme, Payment } from '@/types/database'
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
import { formatDate, getInitials } from '@/lib/utils'
import { Bell, Send, MessageSquare, PhoneCall, Smartphone, Sparkles, MessageCircle, Clock, CheckCircle2, History, AlertTriangle, Filter } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// Helper to determine if an active chit is overdue
const isChitOverdue = (chit: any) => {
  if (!chit.start_date || !chit.agreed_amount) return false;
  
  const startDate = new Date(chit.start_date)
  const now = new Date()
  
  let monthsElapsed = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth())
  if (now.getDate() < chit.monthly_due_day) monthsElapsed--
  monthsElapsed = Math.max(0, monthsElapsed)
  
  const expectedTotal = monthsElapsed * chit.agreed_amount
  const actualTotal = chit.payments?.reduce((acc: number, p: any) => acc + p.amount, 0) || 0
  
  return actualTotal < expectedTotal
}

export const RemindersPage: React.FC = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [openSend, setOpenSend] = useState(false)

  // Filters state
  const [filterSchemeId, setFilterSchemeId] = useState<string>('all')
  const [filterDueDate, setFilterDueDate] = useState<string>('')
  const [filterOverdueOnly, setFilterOverdueOnly] = useState<boolean>(false)

  // Form & Selection State
  const [selectedChitId, setSelectedChitId] = useState<string>('')
  const [selectedChitIds, setSelectedChitIds] = useState<string[]>([])
  const [channel, setChannel] = useState<'whatsapp' | 'sms' | 'manual'>('whatsapp')
  const [message, setMessage] = useState('Dear Customer, your monthly chit installment payment is due. Kindly pay at your earliest convenience. Thank you!')
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)

  const handleBulkSend = async () => {
    if (selectedChitIds.length === 0) {
      toast.error('Select at least one customer account to send bulk reminders.')
      return
    }

    setIsBulkProcessing(true)
    let count = 0
    try {
      for (const chitId of selectedChitIds) {
        const chit = activeChits.find(c => c.id === chitId)
        if (!chit) continue

        await supabase.from('reminders').insert({
          customer_id: chit.customer_id,
          customer_chit_id: chit.id,
          channel,
          message,
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_by: user?.id || null,
        })

        if (channel === 'whatsapp' && chit.customer?.phone) {
          const cleanPhone = chit.customer.phone.replace(/[^0-9]/g, '')
          const encodedMsg = encodeURIComponent(message)
          window.open(`https://wa.me/${cleanPhone}?text=${encodedMsg}`, '_blank')
        }
        count++
      }

      toast.success(`Bulk reminders sent & logged for ${count} accounts!`)
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      setSelectedChitIds([])
      setOpenSend(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to send bulk reminders')
    } finally {
      setIsBulkProcessing(false)
    }
  }

  const { data: reminders = [], isLoading: isLoadingReminders } = useQuery({
    queryKey: ['reminders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reminders')
        .select('*, customer:customers(*), sender:profiles!sent_by(full_name, role)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as (Reminder & { customer?: Customer; sender?: { full_name: string; role: string } })[]
    },
  })

  // Fetch active chits with relations to determine due dates and overdue status
  const { data: activeChits = [], isLoading: isLoadingChits } = useQuery({
    queryKey: ['active-customer-chits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_chits')
        .select('*, customer:customers(*), scheme:chit_schemes(*), payments(amount)')
        .eq('status', 'active')
      if (error) throw error
      return data as any[]
    },
  })

  // Fetch schemes for the filter dropdown
  const { data: schemes = [] } = useQuery({
    queryKey: ['schemes-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chit_schemes').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data as Scheme[]
    },
  })

  // Compute filtered chits
  const filteredChits = useMemo(() => {
    return activeChits.filter(chit => {
      if (filterSchemeId !== 'all' && chit.scheme_id !== filterSchemeId) return false;
      if (filterDueDate && chit.monthly_due_day !== parseInt(filterDueDate)) return false;
      if (filterOverdueOnly && !isChitOverdue(chit)) return false;
      return true;
    })
  }, [activeChits, filterSchemeId, filterDueDate, filterOverdueOnly])

  const sendReminderMutation = useMutation({
    mutationFn: async () => {
      const chit = activeChits.find(c => c.id === selectedChitId)
      if (!chit) throw new Error("Please select a valid customer chit account.")

      const { data, error } = await supabase.from('reminders').insert({
        customer_id: chit.customer_id,
        customer_chit_id: chit.id,
        channel,
        message,
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_by: user?.id || null,
      }).select().single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Reminder sent & logged successfully!')
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      setOpenSend(false)
      setSelectedChitId('') // Reset form
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to send reminder')
    },
  })

  // Analytics Metrics
  const totalSent = reminders.length
  const whatsappSent = reminders.filter(r => r.channel === 'whatsapp').length
  const smsSent = reminders.filter(r => r.channel === 'sms').length
  const overdueCount = activeChits.filter(c => isChitOverdue(c)).length

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const cardVariant = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Communications</span>
          </div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            Payment Reminders
          </h1>
          <p className="text-sm text-muted-foreground font-medium max-w-md">
            Engage with your customers through WhatsApp, SMS, or manual call logs to keep collections on track.
          </p>
        </div>

        <Dialog open={openSend} onOpenChange={(val) => {
          setOpenSend(val)
          if (!val) setSelectedChitId('')
        }}>
          <DialogTrigger asChild>
            <GoldButton className="shadow-lg shadow-amber-500/20 group h-11 px-6">
              <Send className="h-4 w-4 mr-2 group-hover:translate-x-1 transition-transform" /> 
              Send New Reminder
            </GoldButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[900px] p-0 overflow-hidden bg-card border-amber-500/30">
            <div className="flex flex-col md:flex-row h-full">
              {/* Form & Filter Section */}
              <div className="flex-[1.2] p-6 space-y-6 bg-background/50 flex flex-col">
                <DialogHeader>
                  <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
                    <Bell className="h-5 w-5 text-amber-500" /> New Reminder
                  </DialogTitle>
                </DialogHeader>
                
                {/* Filters */}
                <div className="bg-muted/30 p-3 rounded-xl border border-border/50 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                    <Filter className="h-3 w-3" /> Filters
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase text-muted-foreground font-bold">By Scheme</Label>
                      <Select value={filterSchemeId} onValueChange={setFilterSchemeId}>
                        <SelectTrigger className="h-8 text-xs border-amber-500/20">
                          <SelectValue placeholder="All Schemes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Schemes</SelectItem>
                          {schemes.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase text-muted-foreground font-bold">By Due Date</Label>
                      <Input 
                        type="number" 
                        min="1" max="28" 
                        placeholder="e.g. 5" 
                        className="h-8 text-xs border-amber-500/20"
                        value={filterDueDate}
                        onChange={(e) => setFilterDueDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="pt-1 flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="overdue-toggle"
                      checked={filterOverdueOnly}
                      onChange={(e) => setFilterOverdueOnly(e.target.checked)}
                      className="accent-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <Label htmlFor="overdue-toggle" className="text-xs cursor-pointer font-bold text-red-600 dark:text-red-400">
                      Show Overdue Accounts Only
                    </Label>
                  </div>
                </div>

                <form
                  id="reminder-form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    sendReminderMutation.mutate()
                  }}
                  className="space-y-5 flex-1"
                >
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Select Member Account</Label>
                    <Select value={selectedChitId} onValueChange={setSelectedChitId}>
                      <SelectTrigger className="h-10 border-amber-500/30 focus:ring-amber-500">
                        <SelectValue placeholder={`Select... (${filteredChits.length} matched)`} />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingChits ? (
                          <div className="p-2 text-xs text-muted-foreground text-center">Loading...</div>
                        ) : filteredChits.length === 0 ? (
                          <div className="p-2 text-xs text-muted-foreground text-center">No accounts match filters.</div>
                        ) : (
                          filteredChits.map((c) => {
                            const isOv = isChitOverdue(c)
                            return (
                              <SelectItem key={c.id} value={c.id} className="cursor-pointer">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{c.customer?.name}</span>
                                  <span className="text-muted-foreground text-xs border-l border-border pl-2">{c.scheme?.name} (Due: {c.monthly_due_day})</span>
                                  {isOv && <AlertTriangle className="h-3.5 w-3.5 text-red-500 ml-1" />}
                                </div>
                              </SelectItem>
                            )
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Communication Channel</Label>
                    <Select value={channel} onValueChange={(v: any) => setChannel(v)}>
                      <SelectTrigger className="h-10 border-amber-500/30 focus:ring-amber-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">WhatsApp Message</SelectItem>
                        <SelectItem value="sms">SMS Text</SelectItem>
                        <SelectItem value="manual">Manual Call Log</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground flex justify-between">
                      Message Content
                      <span className="text-[10px] text-muted-foreground font-normal">{message.length}/500</span>
                    </Label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      className="flex min-h-[100px] w-full rounded-xl border border-amber-500/30 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none transition-colors"
                      placeholder="Type your reminder message here..."
                    />
                  </div>
                </form>
              </div>

              {/* Preview Section */}
              <div className="flex-1 bg-gradient-to-br from-amber-500/5 to-orange-500/10 p-6 flex flex-col justify-between border-l border-border/50">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-foreground">
                    <Smartphone className="h-4 w-4 text-amber-500" /> Live Preview
                  </div>
                  
                  {/* Chat Bubble Mockup */}
                  <div className="rounded-2xl border border-border/50 bg-background/50 backdrop-blur-sm p-4 h-[280px] relative overflow-hidden flex flex-col justify-end shadow-inner">
                     <div className="absolute top-3 left-4 flex items-center gap-2 opacity-60">
                        {channel === 'whatsapp' ? (
                          <><MessageCircle className="h-4 w-4 text-emerald-500" /><span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">WhatsApp</span></>
                        ) : channel === 'sms' ? (
                          <><MessageSquare className="h-4 w-4 text-blue-500" /><span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400">SMS Text</span></>
                        ) : (
                          <><PhoneCall className="h-4 w-4 text-amber-500" /><span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">Call Log Note</span></>
                        )}
                     </div>
                     
                     <div className="flex flex-col gap-2 w-full mt-8 overflow-y-auto pr-1 pb-1 custom-scrollbar">
                       <AnimatePresence>
                         <motion.div 
                           initial={{ scale: 0.9, opacity: 0, y: 10 }}
                           animate={{ scale: 1, opacity: 1, y: 0 }}
                           exit={{ scale: 0.9, opacity: 0, y: 10 }}
                           key={message}
                           className={`p-3 text-sm max-w-[85%] self-end shadow-md leading-relaxed whitespace-pre-wrap
                             ${channel === 'whatsapp' ? 'bg-[#005c4b] dark:bg-[#005c4b] text-[#e9edef] rounded-2xl rounded-tr-sm' : 
                               channel === 'sms' ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm' : 
                               'bg-card text-foreground rounded-xl border border-border/50'}`}
                         >
                           {message || 'Type your message...'}
                           <div className={`text-[9px] text-right mt-1.5 flex justify-end items-center gap-1
                              ${channel === 'whatsapp' ? 'text-[#8696a0]' : 'opacity-70'}`}>
                             {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             {channel === 'whatsapp' && <CheckCircle2 className="h-3 w-3 text-[#53bdeb]" />}
                           </div>
                         </motion.div>
                       </AnimatePresence>
                     </div>
                  </div>
                </div>

                <DialogFooter className="mt-6 sm:justify-end border-t border-border/50 pt-4">
                  <Button variant="ghost" type="button" onClick={() => setOpenSend(false)} className="text-muted-foreground hover:text-foreground">
                    Cancel
                  </Button>
                  <GoldButton type="submit" form="reminder-form" disabled={sendReminderMutation.isPending || !selectedChitId} className="min-w-[140px]">
                    {sendReminderMutation.isPending ? 'Sending...' : (
                      <>Send Now <Send className="h-3.5 w-3.5 ml-2" /></>
                    )}
                  </GoldButton>
                </DialogFooter>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Dashboard */}
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"
      >
        <motion.div variants={cardVariant}>
          <Card className="p-5 flex items-center gap-4 bg-gradient-to-br from-card to-card/50 border-border/40 hover:border-amber-500/30 transition-all hover:shadow-md group">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Bell className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground">Total Reminders</p>
              <h3 className="text-2xl font-extrabold text-foreground">{totalSent}</h3>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={cardVariant}>
          <Card className="p-5 flex items-center gap-4 bg-gradient-to-br from-card to-card/50 border-border/40 hover:border-emerald-500/30 transition-all hover:shadow-md group">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageCircle className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground">WhatsApp Sent</p>
              <h3 className="text-2xl font-extrabold text-foreground">{whatsappSent}</h3>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={cardVariant}>
          <Card className="p-5 flex items-center gap-4 bg-gradient-to-br from-card to-card/50 border-border/40 hover:border-blue-500/30 transition-all hover:shadow-md group">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <MessageSquare className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground">SMS Sent</p>
              <h3 className="text-2xl font-extrabold text-foreground">{smsSent}</h3>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={cardVariant}>
          <Card className="p-5 flex items-center gap-4 bg-gradient-to-br from-card to-card/50 border-border/40 hover:border-red-500/30 transition-all hover:shadow-md group">
            <div className="h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground">Overdue Accounts</p>
              <h3 className="text-2xl font-extrabold text-red-600 dark:text-red-400">{overdueCount}</h3>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Activity Timeline / Logs */}
      <Card className="border-border/40 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-border/50 bg-muted/20 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-lg flex items-center gap-2 text-foreground">
              <History className="h-5 w-5 text-amber-500" /> Reminder History
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Chronological log of all sent notices and calls</p>
          </div>
        </div>

        <div className="p-6">
          {isLoadingReminders ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-4 p-4 rounded-xl bg-muted/40 animate-pulse h-24" />
              ))}
            </div>
          ) : reminders.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="h-20 w-20 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Bell className="h-10 w-10 text-amber-500/50" />
              </div>
              <div>
                <h4 className="font-bold text-foreground">No Reminders Yet</h4>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  You haven't sent any payment reminders to your customers. Click the "Send New Reminder" button to start.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {reminders.map((r, i) => (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.05, 0.5) }}
                  key={r.id}
                  className="flex gap-4 p-4 rounded-xl bg-card border border-border/40 hover:border-amber-500/30 hover:shadow-md transition-all relative overflow-hidden group"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-yellow-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <Avatar className="h-11 w-11 border-2 border-background shadow-sm shrink-0">
                    <AvatarImage src={r.customer?.photo_url ?? undefined} />
                    <AvatarFallback className="bg-amber-500/10 text-amber-700 font-bold">
                      {getInitials(r.customer?.name || 'U')}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                      <h4 className="font-extrabold text-sm text-foreground truncate">{r.customer?.name || 'Unknown Customer'}</h4>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground whitespace-nowrap bg-muted/50 px-2 py-0.5 rounded-full">
                        <Clock className="h-3 w-3" />
                        {formatDate(r.created_at)}
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <Badge variant="outline" className={`shrink-0 text-[10px] font-bold uppercase tracking-wider ${
                        r.channel === 'whatsapp' ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                        r.channel === 'sms' ? 'text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-500/10' :
                        'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10'
                      }`}>
                        {r.channel === 'whatsapp' && <MessageCircle className="h-3 w-3 mr-1" />}
                        {r.channel === 'sms' && <MessageSquare className="h-3 w-3 mr-1" />}
                        {r.channel === 'manual' && <PhoneCall className="h-3 w-3 mr-1" />}
                        {r.channel}
                      </Badge>

                      <Badge variant="secondary" className="shrink-0 text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                        By: {r.sender?.full_name || 'Admin'}
                      </Badge>

                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {r.message}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}


