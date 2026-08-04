import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { BusinessProfile } from '@/types/database'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GoldButton } from '@/components/ui/gold-button'
import { toast } from 'sonner'
import { Store, Phone, Mail, MapPin } from 'lucide-react'

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [profileId, setProfileId] = useState<string | null>(null)
  const [shopName, setShopName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [gstin, setGstin] = useState('')

  const { data: business } = useQuery({
    queryKey: ['business-profile'],
    queryFn: async () => {
      const { data, error } = await supabase.from('business_profile').select('*').limit(1).maybeSingle()
      if (error && error.code !== 'PGRST116') throw error
      return data as BusinessProfile | null
    },
  })

  useEffect(() => {
    if (business) {
      setProfileId(business.id)
      setShopName(business.shop_name ?? '')
      setPhone(business.phone ?? '')
      setEmail(business.email ?? '')
      setAddress(business.address ?? '')
      setGstin(business.gstin ?? '')
    }
  }, [business])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Partial<BusinessProfile> = {
        shop_name: shopName,
        phone,
        email,
        address,
        gstin,
        updated_at: new Date().toISOString(),
      }
      if (profileId) {
        payload.id = profileId
      }

      const { data, error } = await supabase.from('business_profile').upsert(payload).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      if (data?.id) setProfileId(data.id)
      toast.success('Business profile updated successfully in Supabase!')
      queryClient.invalidateQueries({ queryKey: ['business-profile'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update business profile')
    },
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Business Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage jewelry store name, contact info & receipt details</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sname">Store / Shop Name</Label>
            <div className="relative">
              <Store className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="sname"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sphone">Contact Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="sphone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="semail">Contact Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="semail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="saddr">Showroom Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="saddr"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sgst">GSTIN Registration</Label>
            <Input
              id="sgst"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
            />
          </div>

          <GoldButton type="submit" className="mt-4" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
          </GoldButton>
        </form>
      </Card>
    </div>
  )
}
