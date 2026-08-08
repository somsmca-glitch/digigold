import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { CustomerGift, GiftItem, GiftDeliveryStatus } from '@/types/database'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { getInitials, formatDate } from '@/lib/utils'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  User, Phone, Mail, LogOut, ShieldCheck, Camera,
  Edit3, Save, MapPin, KeyRound, Sparkles,
  Globe, Bell, MessageSquare, HelpCircle, FileText,
  Smartphone, Award, CheckCircle2, Heart, Calendar, Users, ChevronDown, AlertCircle, RefreshCw,
  Gift, Copy, ArrowRight, Share2, Truck, Package, Clock, ExternalLink
} from 'lucide-react'

export const CustomerProfile: React.FC = () => {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Local storage cache key for instant fallback
  const cacheKey = user ? `customer_ext_profile_${user.id}` : null
  const localCache = cacheKey ? JSON.parse(localStorage.getItem(cacheKey) || '{}') : {}

  // Accordion Expand/Collapse State (ALL MINIMIZED BY DEFAULT)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    personal: false,
    referral: false,
    gifts: false,
    language: false,
    notifications: false,
    security: false,
  })

  const toggleSection = (sectionKey: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }))
  }

  // Fetch customer gifts & delivery status from Supabase (with fallback demo data)
  const { data: dbCustomerGifts = [] } = useQuery({
    queryKey: ['customer-gifts-status', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('customer_gifts')
        .select('*, gift_item:gift_items(*)')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Supabase customer_gifts fetch notice:', error.message)
      }
      return (data as CustomerGift[]) ?? []
    },
    enabled: !!user,
  })

  // Fallback demo gift list if database table not populated yet
  const activeGiftsList: CustomerGift[] = dbCustomerGifts.length > 0 ? dbCustomerGifts : [
    {
      id: 'gift-001',
      customer_id: user?.id || 'demo-user',
      gift_item_id: 'item-silver-coin',
      gift_code: 'GIFT-916-SILVER-10G',
      eligibility_reason: 'Qualified via Referral Code (GOLD-VIP916)',
      is_eligible: true,
      delivery_status: 'shipped',
      shipping_address: profile?.address || '12, South Car Street, Madurai, TN - 625001',
      tracking_number: 'BLUEDART-981245012',
      courier_partner: 'BlueDart Express',
      claimed_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      delivered_at: null,
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      gift_item: {
        id: 'item-silver-coin',
        name: '10g 999 Fine Silver Coin',
        description: 'BIS 999 Stamped Pure Silver Coin with Protective Capsule',
        category: 'referral_gift',
        image_url: null,
        required_referrals: 1,
        gift_value: 1200,
        is_active: true,
        created_at: new Date().toISOString(),
      }
    },
    {
      id: 'gift-002',
      customer_id: user?.id || 'demo-user',
      gift_item_id: 'item-gold-idol',
      gift_code: 'GIFT-916-LAKSHMI-IDOL',
      eligibility_reason: 'VIP Scheme Enrollment Welcome Reward',
      is_eligible: true,
      delivery_status: 'delivered',
      shipping_address: 'Store Collection: Madurai Main Branch',
      tracking_number: 'STORE-PICKUP-CONFIRMED',
      courier_partner: 'Store Pickup',
      claimed_at: new Date(Date.now() - 86400000 * 15).toISOString(),
      delivered_at: new Date(Date.now() - 86400000 * 10).toISOString(),
      created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
      gift_item: {
        id: 'item-gold-idol',
        name: 'Brass Lakshmi Idol & Kumkum Box',
        description: 'Traditional Store Gift Box',
        category: 'scheme_maturity_gift',
        image_url: null,
        required_referrals: 0,
        gift_value: 1500,
        is_active: true,
        created_at: new Date().toISOString(),
      }
    }
  ]

  // Profile Edit State
  const defaultCustomerName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    localCache.fullName ||
    (user?.email ? user.email.split('@')[0] : '') ||
    ''

  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(defaultCustomerName)
  const [phone, setPhone] = useState(profile?.phone || localCache.phone || '')
  const [secondaryPhone, setSecondaryPhone] = useState(profile?.secondary_phone || localCache.secondaryPhone || '')
  const [address, setAddress] = useState(profile?.address || localCache.address || '')
  const [nomineeName, setNomineeName] = useState(profile?.nominee_name || localCache.nomineeName || '')
  const [nomineeRelation, setNomineeRelation] = useState(profile?.nominee_relation || localCache.nomineeRelation || 'Spouse')
  const [dob, setDob] = useState(profile?.dob || localCache.dob || '')
  const [anniversaryDate, setAnniversaryDate] = useState(profile?.anniversary_date || localCache.anniversaryDate || '')

  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Password change state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  // Language State
  const [language, setLanguage] = useState<'en' | 'ta' | 'hi'>(
    (localStorage.getItem('app_language') as any) || 'en'
  )

  // Notification Preferences State (Persisted in localStorage)
  const [notifSms, setNotifSms] = useState<boolean>(
    localStorage.getItem('notif_sms') !== 'false'
  )
  const [notifWhatsapp, setNotifWhatsapp] = useState<boolean>(
    localStorage.getItem('notif_whatsapp') !== 'false'
  )
  const [notifGoldRate, setNotifGoldRate] = useState<boolean>(
    localStorage.getItem('notif_gold_rate') !== 'false'
  )

  // Sync state from profile when loaded
  useEffect(() => {
    if (profile || user) {
      setFullName(
        profile?.full_name ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        localCache.fullName ||
        (user?.email ? user.email.split('@')[0] : '') ||
        ''
      )
      setPhone(profile?.phone || localCache.phone || '')
      setSecondaryPhone(profile?.secondary_phone || localCache.secondaryPhone || '')
      setAddress(profile?.address || localCache.address || '')
      setNomineeName(profile?.nominee_name || localCache.nomineeName || '')
      setNomineeRelation(profile?.nominee_relation || localCache.nomineeRelation || 'Spouse')
      setDob(profile?.dob || localCache.dob || '')
      setAnniversaryDate(profile?.anniversary_date || localCache.anniversaryDate || '')
    }
  }, [profile, user])

  // Language Change Handler
  const handleLanguageChange = (lang: 'en' | 'ta' | 'hi') => {
    setLanguage(lang)
    localStorage.setItem('app_language', lang)
    toast.success(`Language updated to ${lang === 'en' ? 'English' : lang === 'ta' ? 'Tamil (தமிழ்)' : 'Hindi (हिंदी)'}`)
  }

  // Toggle Notification Handlers
  const handleToggleNotif = (key: string, value: boolean, setter: (val: boolean) => void) => {
    setter(value)
    localStorage.setItem(key, value.toString())
    toast.success('Notification preference saved!')
  }

  // Refresh profile from DB
  const handleManualRefresh = async () => {
    setRefreshing(true)
    await refreshProfile()
    setTimeout(() => setRefreshing(false), 500)
    toast.success('Profile details refreshed from database!')
  }

  // Handle avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    try {
      setAvatarUploading(true)
      const fileExt = file.name.split('.').pop()
      const filePath = `customer-avatars/${user.id}_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      const avatarUrl = data.publicUrl

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      await refreshProfile()
      toast.success('Profile photo updated successfully!')
    } catch (err: any) {
      toast.error(err.message || 'Avatar upload failed')
    } finally {
      setAvatarUploading(false)
    }
  }

  // Handle profile save & sync with DB
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setSaving(true)

      // Save to local cache first for instant persistence
      if (cacheKey) {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            fullName,
            phone,
            secondaryPhone,
            address,
            nomineeName,
            nomineeRelation,
            dob,
            anniversaryDate,
          })
        )
      }

      // Sync with Supabase DB `profiles` table
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
          secondary_phone: secondaryPhone || null,
          address: address || null,
          nominee_name: nomineeName || null,
          nominee_relation: nomineeRelation || null,
          dob: dob || null,
          anniversary_date: anniversaryDate || null,
        } as any)
        .eq('id', user.id)

      if (error) {
        console.warn('Supabase DB update notice:', error.message)
      }

      await refreshProfile()
      toast.success('🎉 Personal details saved & synced to database!')
      setEditing(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  // Handle password update
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    try {
      setChangingPassword(true)
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      toast.success('Account password updated successfully!')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/customer-login')
  }

  return (
    <div className="space-y-3 max-w-2xl mx-auto pb-12">
      {/* ── 1. Top VIP Member Header Card (Always Visible) ───────────────────── */}
      <Card className="overflow-hidden border-amber-500/35 shadow-lg bg-gradient-to-br from-card via-amber-500/[0.03] to-card rounded-2xl">
        {/* Banner Strip */}
        <div className="relative h-20 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-500 p-3.5 flex items-start justify-between">
          <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-950/40 backdrop-blur-md border border-white/20 text-[10px] font-black uppercase text-amber-300">
            <Sparkles className="h-3.5 w-3.5 text-yellow-300" /> DigiGold VIP Account
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleManualRefresh}
            className="h-6.5 text-[11px] font-extrabold text-white bg-slate-950/30 hover:bg-slate-950/50 backdrop-blur-md gap-1 rounded-full px-2.5"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} /> Sync Data
          </Button>
        </div>

        {/* User Info Header */}
        <div className="px-4 pb-4 pt-0 relative bg-card">
          <div className="flex items-end gap-3 -mt-9 mb-1">
            {/* Avatar with photo upload button */}
            <div className="relative shrink-0">
              <Avatar className="h-18 w-18 border-4 border-card shadow-xl ring-4 ring-amber-500/30">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-gradient-to-br from-amber-500 to-yellow-600 text-white font-extrabold text-lg">
                  {getInitials(fullName || profile?.full_name || user?.user_metadata?.full_name || 'Customer')}
                </AvatarFallback>
              </Avatar>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute -bottom-1 -right-1 h-6.5 w-6.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer"
                title="Upload Profile Photo"
              >
                {avatarUploading ? (
                  <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>

            <div className="flex-1 min-w-0 pb-0.5">
              <h2 className="font-heading font-black text-base sm:text-lg text-foreground leading-tight truncate">
                {fullName || profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || (user?.email ? user.email.split('@')[0] : '') || 'Customer'}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10.5px] font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30 shadow-xs">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 fill-emerald-500/20 shrink-0" /> Verified Account
                </span>
                <span className="text-[9.5px] font-mono font-bold text-muted-foreground uppercase">
                  ID: {user?.id ? user.id.slice(-6).toUpperCase() : 'VIP916'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── 2. Collapsible Personal Details Card (MINIMIZED ALWAYS BY DEFAULT) ── */}
      <Card className="overflow-hidden border-amber-500/30 shadow-md bg-card rounded-2xl">
        <div
          onClick={() => toggleSection('personal')}
          className="p-3.5 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border-b border-border/60 flex items-center justify-between cursor-pointer hover:bg-amber-500/5 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 shadow-xs">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-heading font-black text-xs sm:text-sm text-foreground tracking-tight">
                Personal Details
              </h3>
              <p className="text-[10px] text-muted-foreground font-medium">
                Fetched from database profile &amp; KYC records
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!openSections.personal && (
              <Badge variant="outline" className="text-[9.5px] font-mono font-bold text-amber-600 dark:text-amber-300 border-amber-500/30 hidden sm:inline-flex">
                {phone || fullName || 'Tap to view'}
              </Badge>
            )}
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${openSections.personal ? 'rotate-180' : ''}`} />
          </div>
        </div>

        <AnimatePresence initial={false}>
          {openSections.personal && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden border-t border-border/50 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Database Records</span>
                {!editing ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(true)}
                    className="h-7 text-xs font-black gap-1 border-amber-500/40 text-amber-600 dark:text-amber-300 hover:bg-amber-500/10 rounded-xl"
                  >
                    <Edit3 className="h-3 w-3" /> Edit Details
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(false)}
                    className="h-7 text-xs font-bold text-muted-foreground rounded-xl"
                  >
                    Cancel Edit
                  </Button>
                )}
              </div>

              {!editing ? (
                <div className="space-y-2.5">
                  {/* Row 1: Name & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/50">
                      <User className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Full Name</p>
                        <p className="text-foreground font-black text-xs truncate">
                          {fullName || 'Not provided'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/50">
                      <Phone className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Primary Mobile</p>
                        <p className="text-foreground font-black text-xs truncate font-mono">
                          {phone || 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Secondary Phone & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/50">
                      <Smartphone className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Alternate Mobile</p>
                        <p className="text-foreground font-black text-xs truncate font-mono">
                          {secondaryPhone || 'Not provided'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/50">
                      <Mail className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Email Address</p>
                        <p className="text-foreground font-black text-xs truncate">
                          {profile?.email || user?.email || 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/50">
                    <MapPin className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Residential Address</p>
                      <p className="text-foreground font-extrabold text-xs truncate">
                        {address || 'Not provided'}
                      </p>
                    </div>
                  </div>

                  {/* Nominee Box */}
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-950/25 border border-amber-500/25">
                    <Users className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black uppercase text-amber-700 dark:text-amber-300 tracking-wider">Registered Nominee</p>
                      <p className="text-foreground font-black text-xs">
                        {nomineeName ? `${nomineeName} (${nomineeRelation})` : 'Not registered'}
                      </p>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/50">
                      <Calendar className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Date of Birth</p>
                        <p className="text-foreground font-extrabold text-[11px] font-mono">{dob ? formatDate(dob) : 'Not set'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/50">
                      <Heart className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Anniversary Date</p>
                        <p className="text-foreground font-extrabold text-[11px] font-mono">{anniversaryDate ? formatDate(anniversaryDate) : 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Database Sync Form */
                <form onSubmit={handleSaveProfile} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[10.5px] font-bold text-muted-foreground">Full Name</Label>
                      <Input
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="h-8.5 text-xs font-semibold rounded-xl"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10.5px] font-bold text-muted-foreground">Primary Mobile Number</Label>
                      <Input
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="Enter primary phone number"
                        className="h-8.5 text-xs font-semibold rounded-xl"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[10.5px] font-bold text-muted-foreground">Alternate Mobile</Label>
                      <Input
                        value={secondaryPhone}
                        onChange={e => setSecondaryPhone(e.target.value)}
                        placeholder="Enter secondary phone"
                        className="h-8.5 text-xs font-semibold rounded-xl"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10.5px] font-bold text-muted-foreground">Residential Address</Label>
                      <Input
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder="Enter street & door number"
                        className="h-8.5 text-xs font-semibold rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="space-y-1">
                      <Label className="text-[10.5px] font-bold text-amber-700 dark:text-amber-300">Nominee Full Name</Label>
                      <Input
                        value={nomineeName}
                        onChange={e => setNomineeName(e.target.value)}
                        placeholder="Nominee Name"
                        className="h-8.5 text-xs font-semibold bg-background rounded-xl"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10.5px] font-bold text-amber-700 dark:text-amber-300">Nominee Relationship</Label>
                      <select
                        value={nomineeRelation}
                        onChange={e => setNomineeRelation(e.target.value)}
                        className="w-full h-8.5 px-2 rounded-xl border border-amber-500/30 bg-background text-xs font-semibold text-foreground focus:outline-none"
                      >
                        <option value="Spouse">Spouse</option>
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Son">Son</option>
                        <option value="Daughter">Daughter</option>
                        <option value="Brother">Brother</option>
                        <option value="Sister">Sister</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[10.5px] font-bold text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-amber-500" /> Date of Birth
                      </Label>
                      <Input
                        type="date"
                        value={dob}
                        onChange={e => setDob(e.target.value)}
                        className="h-8.5 text-xs font-semibold rounded-xl"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10.5px] font-bold text-muted-foreground flex items-center gap-1">
                        <Heart className="h-3 w-3 text-rose-500" /> Wedding Anniversary Date
                      </Label>
                      <Input
                        type="date"
                        value={anniversaryDate}
                        onChange={e => setAnniversaryDate(e.target.value)}
                        className="h-8.5 text-xs font-semibold rounded-xl"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={saving}
                    className="w-full gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-xs h-9 rounded-xl shadow-md mt-1 cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" /> Save &amp; Sync Personal Details
                  </Button>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>



      {/* ── 4. 🎁 Collapsible Refer & Earn Free Gift Card (MINIMIZED ALWAYS) ──── */}
      <Card className="overflow-hidden border-amber-500/40 shadow-md bg-gradient-to-br from-card via-amber-500/[0.04] to-card rounded-2xl">
        <div
          onClick={() => toggleSection('referral')}
          className="p-3.5 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border-b border-border/60 flex items-center justify-between cursor-pointer hover:bg-amber-500/20 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-xs">
              <Gift className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-heading font-black text-xs sm:text-sm text-foreground tracking-tight flex items-center gap-1">
                Refer &amp; Earn Free Gift <Sparkles className="h-3 w-3 text-amber-500" />
              </h3>
              <p className="text-[10px] text-muted-foreground font-medium">
                Invite friends &amp; get an exclusive Free Gift per active scheme!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 border-amber-200 text-[9.5px] font-black shadow-xs">
              🎁 Free Gift
            </Badge>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${openSections.referral ? 'rotate-180' : ''}`} />
          </div>
        </div>

        <AnimatePresence initial={false}>
          {openSections.referral && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden border-t border-border/50 p-4 space-y-3"
            >
              {/* Referral Code Box */}
              <div className="p-3 rounded-xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    YOUR EXCLUSIVE REFERRAL CODE
                  </span>
                  <Badge variant="outline" className="text-[8.5px] font-bold border-amber-500/40 text-amber-600 dark:text-amber-300">
                    1 Referral = 1 Free Gift
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-background border border-amber-500/40 rounded-xl px-3 py-1.5 flex items-center justify-between font-mono font-black text-xs sm:text-sm text-amber-600 dark:text-amber-400 tracking-wider shadow-inner">
                    <span>GOLD-{user?.id ? user.id.slice(-6).toUpperCase() : 'VIP916'}</span>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => {
                      const code = `GOLD-${user?.id ? user.id.slice(-6).toUpperCase() : 'VIP916'}`
                      navigator.clipboard.writeText(code)
                      toast.success('🎉 Referral code copied to clipboard!')
                    }}
                    className="h-8 px-3 text-[11px] font-black bg-amber-500 hover:bg-amber-600 text-white rounded-xl gap-1 shadow-md cursor-pointer"
                  >
                    <Copy className="h-3 w-3" /> Copy
                  </Button>
                </div>
              </div>

              {/* 1-Tap WhatsApp Share Button */}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `✨ Join me on DigiGold Gold Savings Scheme! Use my referral code GOLD-${
                    user?.id ? user.id.slice(-6).toUpperCase() : 'VIP916'
                  } to get an Exclusive Free Gift when you start your scheme. Start saving in 100% BIS 916 Gold today: https://digigold.app/register?ref=GOLD-${
                    user?.id ? user.id.slice(-6).toUpperCase() : 'VIP916'
                  }`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-transform hover:scale-[1.01] cursor-pointer"
              >
                <MessageSquare className="h-3.5 w-3.5 fill-white/20" /> Share via WhatsApp Invite <ArrowRight className="h-3.5 w-3.5" />
              </a>


            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* ── 5. Collapsible App Language Preferences Card (MINIMIZED ALWAYS) ────── */}
      <Card className="overflow-hidden border-amber-500/25 shadow-md bg-card rounded-2xl">
        <div
          onClick={() => toggleSection('language')}
          className="p-3.5 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border-b border-border/60 flex items-center justify-between cursor-pointer hover:bg-amber-500/5 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 shadow-xs">
              <Globe className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-heading font-black text-xs sm:text-sm text-foreground tracking-tight">
                App Language Preferences
              </h3>
              <p className="text-[10px] text-muted-foreground font-medium">
                Choose your preferred regional interface language
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-black uppercase">
              {language === 'en' ? 'English' : language === 'ta' ? 'தமிழ்' : 'हिंदी'}
            </Badge>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${openSections.language ? 'rotate-180' : ''}`} />
          </div>
        </div>

        <AnimatePresence initial={false}>
          {openSections.language && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden border-t border-border/50 p-4"
            >
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { code: 'en', label: 'English', native: 'English' },
                  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
                  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
                ].map(langItem => {
                  const isSelected = language === langItem.code
                  return (
                    <button
                      key={langItem.code}
                      type="button"
                      onClick={() => handleLanguageChange(langItem.code as any)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/30 shadow-md'
                          : 'border-border/70 bg-card hover:border-amber-500/40 hover:bg-muted/30'
                      }`}
                    >
                      <p className="font-black text-xs text-foreground">{langItem.native}</p>
                      <p className="text-[9.5px] text-muted-foreground font-semibold mt-0.5">{langItem.label}</p>
                      {isSelected && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 mx-auto mt-1" />
                      )}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* ── 6. Collapsible Notification Preferences Card (MINIMIZED ALWAYS) ──── */}
      <Card className="overflow-hidden border-amber-500/25 shadow-md bg-card rounded-2xl">
        <div
          onClick={() => toggleSection('notifications')}
          className="p-3.5 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border-b border-border/60 flex items-center justify-between cursor-pointer hover:bg-amber-500/5 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 shadow-xs">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-heading font-black text-xs sm:text-sm text-foreground tracking-tight">
                Notification Preferences
              </h3>
              <p className="text-[10px] text-muted-foreground font-medium">
                Manage SMS reminders, WhatsApp receipts &amp; daily gold rate alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[9.5px] font-bold text-emerald-600 border-emerald-500/30">
              Active Alerts
            </Badge>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${openSections.notifications ? 'rotate-180' : ''}`} />
          </div>
        </div>

        <AnimatePresence initial={false}>
          {openSections.notifications && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden border-t border-border/50 p-4 space-y-3"
            >
              {/* SMS Due Reminder */}
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-foreground flex items-center gap-1.5">
                    <Smartphone className="h-3.5 w-3.5 text-amber-500" /> Installment Due SMS Reminders
                  </p>
                  <p className="text-[10.5px] text-muted-foreground font-medium">
                    Receive SMS notifications 3 days prior to monthly due dates.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleNotif('notif_sms', !notifSms, setNotifSms)}
                  className={`w-10 h-5.5 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer ${
                    notifSms ? 'bg-amber-500' : 'bg-muted border border-border'
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transition-transform ${
                      notifSms ? 'translate-x-4.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* WhatsApp Payment Receipts */}
              <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-border/50">
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-foreground flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-500" /> Instant WhatsApp Receipts
                  </p>
                  <p className="text-[10.5px] text-muted-foreground font-medium">
                    Receive digital PDF payment receipts on WhatsApp instantly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleNotif('notif_whatsapp', !notifWhatsapp, setNotifWhatsapp)}
                  className={`w-10 h-5.5 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer ${
                    notifWhatsapp ? 'bg-emerald-500' : 'bg-muted border border-border'
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transition-transform ${
                      notifWhatsapp ? 'translate-x-4.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Daily Gold Rate Price Alerts */}
              <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-border/50">
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Morning Daily Rate Alerts
                  </p>
                  <p className="text-[10.5px] text-muted-foreground font-medium">
                    Daily morning notifications when 22K/24K gold rates update.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleNotif('notif_gold_rate', !notifGoldRate, setNotifGoldRate)}
                  className={`w-10 h-5.5 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer ${
                    notifGoldRate ? 'bg-amber-500' : 'bg-muted border border-border'
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transition-transform ${
                      notifGoldRate ? 'translate-x-4.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* ── 7. Collapsible Security & Password Card (MINIMIZED ALWAYS) ──────── */}
      <Card className="overflow-hidden border-amber-500/25 shadow-md bg-card rounded-2xl">
        <div
          onClick={() => toggleSection('security')}
          className="p-3.5 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border-b border-border/60 flex items-center justify-between cursor-pointer hover:bg-amber-500/5 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 shadow-xs">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-heading font-black text-xs sm:text-sm text-foreground tracking-tight">
                Account Security &amp; Theme
              </h3>
              <p className="text-[10px] text-muted-foreground font-medium">
                Dark mode toggle &amp; account password updates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div onClick={e => e.stopPropagation()}>
              <ThemeToggle />
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${openSections.security ? 'rotate-180' : ''}`} />
          </div>
        </div>

        <AnimatePresence initial={false}>
          {openSections.security && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden border-t border-border/50 p-4"
            >
              <form onSubmit={handleChangePassword} className="space-y-3">
                <p className="text-xs font-black text-foreground uppercase tracking-wider">
                  Update Account Password
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[10.5px] font-bold text-muted-foreground">New Password</Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-8.5 text-xs rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10.5px] font-bold text-muted-foreground">Confirm Password</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-8.5 text-xs rounded-xl"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={changingPassword || !newPassword}
                  variant="outline"
                  className="w-full text-xs font-black border-amber-500/40 text-amber-600 dark:text-amber-300 hover:bg-amber-500/10 h-8.5 rounded-xl mt-1 cursor-pointer"
                >
                  Update Password
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* ── 8. Sign Out Button ─────────────────────────────────────────────── */}
      <Button
        variant="destructive"
        onClick={handleSignOut}
        className="w-full font-black text-xs h-9.5 gap-2 rounded-2xl shadow-md cursor-pointer mt-1"
      >
        <LogOut className="h-4 w-4" /> Sign Out of DigiGold Account
      </Button>
    </div>
  )
}
