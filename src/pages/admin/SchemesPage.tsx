import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Scheme } from '@/types/database'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
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
import { toast } from 'sonner'
import { formatINR } from '@/lib/utils'
import { Layers, Plus, Gift, Calendar, Sparkles } from 'lucide-react'

export const SchemesPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [openAdd, setOpenAdd] = useState(false)

  // Form
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [durationMonths, setDurationMonths] = useState('11')
  const [minInstallment, setMinInstallment] = useState('1000')
  const [bonusMonths, setBonusMonths] = useState('1')
  const [giftDescription, setGiftDescription] = useState('')

  const { data: schemes = [], isLoading } = useQuery({
    queryKey: ['schemes-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chit_schemes').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data as Scheme[]
    },
  })

  const addSchemeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from('chit_schemes').insert({
        name,
        description,
        duration_months: parseInt(durationMonths),
        min_installment: parseFloat(minInstallment),
        bonus_months: parseInt(bonusMonths),
        gift_description: giftDescription || null,
        is_active: true,
      }).select().single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Scheme plan created successfully!')
      queryClient.invalidateQueries({ queryKey: ['schemes-all'] })
      setOpenAdd(false)
      setName('')
      setDescription('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create scheme')
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Chit Schemes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage jewelry saving schemes and bonus offers</p>
        </div>

        <Dialog open={openAdd} onOpenChange={setOpenAdd}>
          <DialogTrigger asChild>
            <GoldButton>
              <Plus className="h-4 w-4 mr-2" /> Create New Scheme
            </GoldButton>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Jewelry Scheme Plan</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                addSchemeMutation.mutate()
              }}
              className="space-y-4 py-2"
            >
              <div className="space-y-2">
                <Label htmlFor="sname">Scheme Name</Label>
                <Input
                  id="sname"
                  placeholder="e.g. Swarna Savings 11 Month Plan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sdesc">Description</Label>
                <Input
                  id="sdesc"
                  placeholder="Pay 11 months, 12th month free bonus"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sduration">Duration (Months)</Label>
                  <Input
                    id="sduration"
                    type="number"
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smin">Min Installment (₹)</Label>
                  <Input
                    id="smin"
                    type="number"
                    value={minInstallment}
                    onChange={(e) => setMinInstallment(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sbonus">Bonus Months Free</Label>
                  <Input
                    id="sbonus"
                    type="number"
                    value={bonusMonths}
                    onChange={(e) => setBonusMonths(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sgift">Gift Offer (Optional)</Label>
                  <Input
                    id="sgift"
                    placeholder="Gold Coin / Silver Lamp"
                    value={giftDescription}
                    onChange={(e) => setGiftDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <GoldButton type="submit" disabled={addSchemeMutation.isPending}>
                  {addSchemeMutation.isPending ? 'Creating...' : 'Create Scheme'}
                </GoldButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {schemes.map((scheme) => (
          <Card key={scheme.id} className="p-6 relative border-amber-500/20 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-heading text-lg font-bold text-foreground">{scheme.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{scheme.description || 'Jewelry Chit Plan'}</p>
              </div>
              <Badge variant={scheme.is_active ? 'gold' : 'outline'}>
                {scheme.is_active ? 'Active' : 'Archived'}
              </Badge>
            </div>

            <div className="mt-6 space-y-2 text-sm">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-amber-500" /> Duration
                </span>
                <span className="font-semibold text-foreground">{scheme.duration_months} Months</span>
              </div>

              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Min Installment
                </span>
                <span className="font-semibold text-foreground">{formatINR(scheme.min_installment)}/mo</span>
              </div>

              <div className="flex items-center justify-between pb-2">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Gift className="h-4 w-4 text-amber-500" /> Bonus Benefit
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {scheme.bonus_months > 0 ? `${scheme.bonus_months} Month Free` : 'Standard'}
                </span>
              </div>

              {scheme.gift_description && (
                <div className="mt-3 rounded-lg bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300 font-medium">
                  🎁 Gift Bonus: {scheme.gift_description}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
