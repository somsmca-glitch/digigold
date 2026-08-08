import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { supabase, createNonPersistedClient } from '@/lib/supabase'
import { BusinessProfile, Profile, Customer } from '@/types/database'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GoldButton } from '@/components/ui/gold-button'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { getInitials } from '@/lib/utils'
import {
  Store, Phone, Mail, MapPin, Users, UserPlus, Shield,
  Search, UserCheck, Sparkles,
  BadgeCheck, UserCheck2, Building, User, Lock, ShieldCheck, Check, Layers, Bell, Coins, Copy
} from 'lucide-react'

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'profile' | 'staff'>('profile')

  // Business Profile Form State
  const [profileId, setProfileId] = useState<string | null>(null)
  const [shopName, setShopName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [gstin, setGstin] = useState('')

  // Staff Management State
  const [staffSearch, setStaffSearch] = useState('')
  const [openAddStaff, setOpenAddStaff] = useState(false)
  const [openAllocation, setOpenAllocation] = useState(false)
  const [selectedStaffForAllocation, setSelectedStaffForAllocation] = useState<Profile | null>(null)

  // Add Staff Form State
  const [newStaffName, setNewStaffName] = useState('')
  const [newStaffEmail, setNewStaffEmail] = useState('')
  const [newStaffPhone, setNewStaffPhone] = useState('')
  const [newStaffRole, setNewStaffRole] = useState<'staff' | 'admin'>('staff')

  // Customer Allocation Search
  const [customerSearch, setCustomerSearch] = useState('')

  // Fetch Business Profile
  const { data: business } = useQuery({
    queryKey: ['business-profile'],
    queryFn: async () => {
      const { data, error } = await supabase.from('business_profile').select('*').limit(1).maybeSingle()
      if (error && error.code !== 'PGRST116') throw error
      return data as BusinessProfile | null
    },
  })

  // Fetch Staff Profiles (only role = 'staff')
  const { data: staffList = [], isLoading: isLoadingStaff } = useQuery({
    queryKey: ['staff-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'staff')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Profile[]
    },
  })

  // Fetch Customers for Allocation metrics & mapping
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['customers-allocation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, photo_url, assigned_staff_id, created_at')
        .order('name', { ascending: true })
      if (error) throw error
      return data as Customer[]
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

  // Save Business Settings Mutation
  const saveBusinessMutation = useMutation({
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
      toast.success('Business profile saved successfully!')
      queryClient.invalidateQueries({ queryKey: ['business-profile'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update business profile')
    },
  })

  const [newStaffPassword, setNewStaffPassword] = useState('Staff@123456')

  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string; name: string } | null>(null)

  // Add Staff Profile Mutation
  const addStaffMutation = useMutation({
    mutationFn: async () => {
      if (!newStaffName.trim()) throw new Error('Staff name is required')

      const staffEmail = newStaffEmail.trim() || `staff_${Date.now()}@digigold.local`
      const staffPassword = newStaffPassword.trim() || 'Staff@123456'

      let staffId = ''

      // 1. Create Auth User in auth.users via non-persisted client (prevents logout)
      const tempClient = createNonPersistedClient()
      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: staffEmail,
        password: staffPassword,
        options: {
          data: {
            full_name: newStaffName.trim(),
            role: 'staff',
          },
        },
      })

      if (authData?.user) {
        staffId = authData.user.id
      } else {
        staffId = crypto.randomUUID()
      }

      // 2. Upsert profile in public.profiles table
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: staffId,
          full_name: newStaffName.trim(),
          email: staffEmail,
          phone: newStaffPhone.trim() || null,
          role: 'staff',
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error
      return { data, staffEmail, staffPassword, staffName: newStaffName.trim() }
    },
    onSuccess: (res) => {
      toast.success('New staff account allocated successfully!')
      queryClient.invalidateQueries({ queryKey: ['staff-profiles'] })
      setOpenAddStaff(false)
      setCreatedCreds({
        email: res.staffEmail,
        password: res.staffPassword,
        name: res.staffName,
      })
      setNewStaffName('')
      setNewStaffEmail('')
      setNewStaffPhone('')
      setNewStaffPassword('Staff@123456')
      setNewStaffRole('staff')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create staff profile')
    },
  })

  // Toggle Staff Active Status Mutation
  const toggleStaffStatusMutation = useMutation({
    mutationFn: async ({ staffId, currentStatus }: { staffId: string; currentStatus: boolean }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', staffId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (updated) => {
      toast.success(`Staff member ${updated.is_active ? 'activated' : 'deactivated'}`)
      queryClient.invalidateQueries({ queryKey: ['staff-profiles'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update staff status')
    },
  })

  // Assign/Unassign Customer to Staff Mutation
  const assignCustomerMutation = useMutation({
    mutationFn: async ({ customerId, staffId }: { customerId: string; staffId: string | null }) => {
      const { data, error } = await supabase
        .from('customers')
        .update({ assigned_staff_id: staffId })
        .eq('id', customerId)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers-allocation'] })
      toast.success('Customer allocation updated!')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to allocate customer')
    },
  })

  // Computed metrics
  const staffCustomerCountMap = useMemo(() => {
    const map: Record<string, number> = {}
    customers.forEach(c => {
      if (c.assigned_staff_id) {
        map[c.assigned_staff_id] = (map[c.assigned_staff_id] || 0) + 1
      }
    })
    return map
  }, [customers])

  const filteredStaff = useMemo(() => {
    return staffList.filter(s => {
      const query = staffSearch.toLowerCase().trim()
      if (!query) return true
      return (
        s.full_name?.toLowerCase().includes(query) ||
        s.email?.toLowerCase().includes(query) ||
        s.phone?.includes(query)
      )
    })
  }, [staffList, staffSearch])

  const filteredCustomersForAllocation = useMemo(() => {
    return customers.filter(c => {
      const query = customerSearch.toLowerCase().trim()
      if (!query) return true
      return c.name.toLowerCase().includes(query) || c.phone.includes(query)
    })
  }, [customers, customerSearch])

  const activeStaffCount = staffList.filter(s => s.is_active).length
  const totalAssignedCustomers = customers.filter(c => c.assigned_staff_id).length

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Control Panel</span>
          </div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">
            System Settings
          </h1>
          <p className="text-sm text-muted-foreground max-w-md">
            Manage your showroom identity, staff accounts, and member allocation rules.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-2xl border border-border/50">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'profile'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Store className="h-4 w-4" />
            <span>Store Profile</span>
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'staff'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Staff Allocation</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4 bg-background/30 text-current border-none">
              {staffList.length}
            </Badge>
          </button>
        </div>
      </div>

      {/* Tab Content: Store Profile */}
      {activeTab === 'profile' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl space-y-6">
          <Card className="p-6 border-border/40 shadow-sm">
            <form onSubmit={(e) => { e.preventDefault(); saveBusinessMutation.mutate() }} className="space-y-5">
              <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Jewelry Showroom Profile</h3>
                  <p className="text-xs text-muted-foreground">Appears on receipts, passbooks, and customer messages</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sname" className="text-xs font-bold">Store / Shop Name</Label>
                <div className="relative">
                  <Store className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="sname"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="pl-9 h-10"
                    placeholder="e.g. DigiGold Jewels & Bullion"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sphone" className="text-xs font-bold">Contact Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="sphone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-9 h-10"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="semail" className="text-xs font-bold">Contact Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="semail"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 h-10"
                      placeholder="info@digigoldjewels.com"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="saddr" className="text-xs font-bold">Showroom Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="saddr"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="pl-9 h-10"
                    placeholder="123 Gold Bazaar Road, Commercial Street, Chennai"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sgst" className="text-xs font-bold">GSTIN Registration</Label>
                <Input
                  id="sgst"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="h-10 font-mono text-xs uppercase"
                  placeholder="33AAAAA0000A1Z5"
                />
              </div>

              <div className="pt-2">
                <GoldButton type="submit" disabled={saveBusinessMutation.isPending} className="h-11 px-6">
                  {saveBusinessMutation.isPending ? 'Saving Profile...' : 'Save Settings'}
                </GoldButton>
              </div>
            </form>
          </Card>
        </motion.div>
      )}

      {/* Tab Content: Staff Allocation */}
      {activeTab === 'staff' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 flex items-center gap-4 bg-gradient-to-br from-card to-card/50 border-border/40">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground">Total Staff Accounts</p>
                <h3 className="text-2xl font-extrabold text-foreground">{staffList.length}</h3>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-4 bg-gradient-to-br from-card to-card/50 border-border/40">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <UserCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground">Active Staff</p>
                <h3 className="text-2xl font-extrabold text-foreground">{activeStaffCount}</h3>
              </div>
            </Card>

            <Card className="p-4 flex items-center gap-4 bg-gradient-to-br from-card to-card/50 border-border/40">
              <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <BadgeCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground">Assigned Customers</p>
                <h3 className="text-2xl font-extrabold text-foreground">{totalAssignedCustomers} <span className="text-xs font-normal text-muted-foreground">/ {customers.length}</span></h3>
              </div>
            </Card>
          </div>

          {/* Action Bar & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/40 p-4 rounded-2xl border border-border/40">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff by name, phone or email..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                className="pl-9 h-10 border-border/50 text-xs"
              />
            </div>

            <GoldButton onClick={() => setOpenAddStaff(true)} className="w-full sm:w-auto h-10 px-5 shadow-md shadow-amber-500/15">
              <UserPlus className="h-4 w-4 mr-2" /> Allocate New Staff
            </GoldButton>
          </div>

          {/* Staff List Cards */}
          {isLoadingStaff ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-36 rounded-2xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : filteredStaff.length === 0 ? (
            <Card className="p-12 text-center space-y-3 border-dashed">
              <Users className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
              <h4 className="font-bold text-foreground">No staff members found</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No staff members match your search filter. Click "Allocate New Staff" to add staff accounts.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStaff.map((staff) => {
                const assignedCount = staffCustomerCountMap[staff.id] || 0
                const isAdmin = staff.role === 'admin'

                return (
                  <Card
                    key={staff.id}
                    className={`p-5 space-y-4 transition-all hover:shadow-md border-border/40 relative overflow-hidden ${
                      !staff.is_active ? 'opacity-60 bg-muted/20' : 'bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                          <AvatarImage src={staff.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-amber-500/10 text-amber-600 font-extrabold text-sm">
                            {getInitials(staff.full_name || 'Staff')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-base text-foreground">{staff.full_name || 'Unnamed Staff'}</h4>
                            <Badge variant="outline" className={`text-[10px] font-bold uppercase ${
                              isAdmin
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                : 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                            }`}>
                              {isAdmin ? <Shield className="h-3 w-3 mr-1" /> : <Users className="h-3 w-3 mr-1" />}
                              {staff.role}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{staff.email || 'No email provided'}</p>
                        </div>
                      </div>

                      {/* Active Status Badge */}
                      <Badge className={`shrink-0 text-[10px] font-bold ${
                        staff.is_active
                          ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                          : 'bg-red-500/15 text-red-600 border-red-500/30'
                      }`}>
                        {staff.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    {/* Info Footer & Actions */}
                    <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <UserCheck2 className="h-4 w-4 text-amber-500" />
                        <span><strong className="text-foreground font-bold">{assignedCount}</strong> Customers Allocated</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedStaffForAllocation(staff)
                            setOpenAllocation(true)
                          }}
                          className="h-8 text-xs font-semibold border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                        >
                          Manage Allocation
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleStaffStatusMutation.mutate({ staffId: staff.id, currentStatus: staff.is_active })}
                          className={`h-8 text-xs font-semibold ${
                            staff.is_active ? 'text-red-500 hover:bg-red-500/10' : 'text-emerald-600 hover:bg-emerald-500/10'
                          }`}
                        >
                          {staff.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Dialog 1: Add New Staff Member (Redesigned Premium Pop-up) ── */}
      <Dialog open={openAddStaff} onOpenChange={setOpenAddStaff}>
        <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden border border-amber-500/30 shadow-2xl rounded-2xl">
          {/* Top Decorative Banner Header */}
          <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-500 p-6 text-white relative overflow-hidden">
            {/* Background shimmer decoration */}
            <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-black/10 blur-lg pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                  <UserPlus className="h-5 w-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-extrabold tracking-tight text-white">
                    Allocate Staff Member
                  </DialogTitle>
                  <p className="text-xs text-amber-100 font-medium mt-0.5">
                    Create staff account credentials &amp; assign access privileges
                  </p>
                </div>
              </div>
              <Badge className="bg-white/20 text-white border-white/30 text-[10px] uppercase font-bold px-2.5 py-1 backdrop-blur-sm">
                Staff Account
              </Badge>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              addStaffMutation.mutate()
            }}
            className="p-6 space-y-5"
          >
            {/* Staff Live Avatar & Name Preview */}
            <div className="flex items-center gap-4 p-3.5 rounded-xl bg-amber-500/8 border border-amber-500/20">
              <Avatar className="h-12 w-12 border-2 border-amber-500/40 shadow-sm shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-amber-500 to-yellow-600 text-white font-extrabold text-sm">
                  {getInitials(newStaffName || 'Staff Member')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Staff Identity Preview</p>
                <p className="text-sm font-extrabold text-foreground truncate">
                  {newStaffName.trim() || 'Enter Staff Name below...'}
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">Role: Staff Member (Collection &amp; Enrolments)</p>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                  <User className="h-3.5 w-3.5 text-amber-500" /> Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Ramesh Kumar"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  required
                  className="h-10 text-xs border-border/80 focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    <Mail className="h-3.5 w-3.5 text-amber-500" /> Email Address
                  </Label>
                  <Input
                    type="email"
                    placeholder="ramesh@digigold.com"
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    className="h-10 text-xs border-border/80 focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    <Phone className="h-3.5 w-3.5 text-amber-500" /> Phone Number
                  </Label>
                  <Input
                    placeholder="+91 9876543210"
                    value={newStaffPhone}
                    onChange={(e) => setNewStaffPhone(e.target.value)}
                    className="h-10 text-xs border-border/80 focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                  <Lock className="h-3.5 w-3.5 text-amber-500" /> Initial Password
                </Label>
                <Input
                  type="text"
                  placeholder="Staff@123456"
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  className="h-10 text-xs border-border/80 focus:border-amber-500 font-mono"
                />
                <p className="text-[10px] text-muted-foreground">Default: Staff@123456 (Staff can change password in their profile)</p>
              </div>
            </div>

            {/* Access Privileges Summary Badge Box */}
            <div className="space-y-2 pt-1 border-t border-border/60">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold flex items-center gap-1.5 text-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" /> Granted Permissions
                </span>
                <span className="text-[10px] text-muted-foreground font-semibold">Staff Scoped</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold">
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <span>Customers &amp; Passbook</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <span>Chit Schemes</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <span>Gold Rates</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <span>Reminders</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground italic text-center pt-0.5">
                🔒 Admin-only routes (Dashboard KPIs, Financial Reports &amp; Settings) will be hidden.
              </p>
            </div>

            <DialogFooter className="pt-3 border-t border-border flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpenAddStaff(false)} className="h-9 text-xs">
                Cancel
              </Button>
              <GoldButton type="submit" disabled={addStaffMutation.isPending} className="h-9 text-xs shadow-lg shadow-amber-500/20">
                {addStaffMutation.isPending ? 'Allocating Account...' : 'Confirm & Allocate Staff'}
              </GoldButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog 2: Customer Allocation Drawer / Modal ── */}
      <Dialog open={openAllocation} onOpenChange={setOpenAllocation}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-border/50 bg-background/50">
            <DialogTitle className="text-lg font-extrabold flex items-center gap-2">
              <UserCheck2 className="h-5 w-5 text-amber-500" /> Allocate Customers to {selectedStaffForAllocation?.full_name}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Select which customers are assigned to this staff member for collection &amp; reminders.
            </p>
          </DialogHeader>

          {/* Search bar inside modal */}
          <div className="p-4 bg-muted/20 border-b border-border/40">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers by name or phone..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {/* Customer Selection List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[400px]">
            {isLoadingCustomers ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Loading customer list...</div>
            ) : filteredCustomersForAllocation.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">No customers match search filter.</div>
            ) : (
              filteredCustomersForAllocation.map((customer) => {
                const isAssignedToThisStaff = customer.assigned_staff_id === selectedStaffForAllocation?.id

                return (
                  <div
                    key={customer.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      isAssignedToThisStaff
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-card border-border/40 hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-background">
                        <AvatarImage src={customer.photo_url ?? undefined} />
                        <AvatarFallback className="bg-amber-500/10 text-amber-700 font-bold text-xs">
                          {getInitials(customer.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h5 className="font-bold text-xs text-foreground">{customer.name}</h5>
                        <p className="text-[11px] text-muted-foreground">{customer.phone}</p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={isAssignedToThisStaff ? 'destructive' : 'outline'}
                      onClick={() => {
                        if (!selectedStaffForAllocation) return
                        assignCustomerMutation.mutate({
                          customerId: customer.id,
                          staffId: isAssignedToThisStaff ? null : selectedStaffForAllocation.id,
                        })
                      }}
                      className="h-8 text-xs font-semibold px-3"
                    >
                      {isAssignedToThisStaff ? 'Unassign' : 'Assign Staff'}
                    </Button>
                  </div>
                )
              })
            )}
          </div>

          <DialogFooter className="p-4 border-t border-border/50 bg-background/50">
            <Button onClick={() => setOpenAllocation(false)} className="w-full">
              Done Allocating
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog 3: Created Staff Credentials Success Popup ── */}
      <Dialog open={!!createdCreds} onOpenChange={() => setCreatedCreds(null)}>
        <DialogContent className="sm:max-w-[440px] p-6 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
            <BadgeCheck className="h-7 w-7 text-emerald-500" />
          </div>

          <div>
            <DialogTitle className="text-xl font-extrabold text-foreground">
              Staff Credentials Allocated!
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Share these login details with <strong className="text-foreground">{createdCreds?.name}</strong> to let them sign in.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/40 border border-border/60 text-left space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-bold">Login Email:</span>
              <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                <span>{createdCreds?.email}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => {
                    navigator.clipboard.writeText(createdCreds?.email || '')
                    toast.success('Email copied to clipboard!')
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-bold">Initial Password:</span>
              <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                <span>{createdCreds?.password}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => {
                    navigator.clipboard.writeText(createdCreds?.password || '')
                    toast.success('Password copied to clipboard!')
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <Button
            onClick={() => {
              const text = `DigiGold Staff Credentials:\nEmail: ${createdCreds?.email}\nPassword: ${createdCreds?.password}`
              navigator.clipboard.writeText(text)
              toast.success('All credentials copied to clipboard!')
            }}
            className="w-full gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-bold"
          >
            <Copy className="h-4 w-4" /> Copy All Credentials
          </Button>

          <Button variant="ghost" size="sm" onClick={() => setCreatedCreds(null)} className="w-full text-xs text-muted-foreground">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}

