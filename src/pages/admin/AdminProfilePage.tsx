import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { formatINR, getInitials, formatDate } from '@/lib/utils'
import {
  User, Phone, Mail, Shield, Lock, Camera,
  IndianRupee, Layers, TrendingUp, Calendar,
  CheckCircle2, Edit3, Save, Eye, EyeOff,
  UserCheck2, ShieldCheck, Star,
} from 'lucide-react'

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: 'easeOut' },
  }),
}

export const AdminProfilePage: React.FC = () => {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()

  // Edit state
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)

  // Avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const todayStr = new Date().toISOString().split('T')[0]

  // ── Fetch performance stats ─────────────────────────────────────
  const { data: stats } = useQuery({
    queryKey: ['profile-stats', user?.id],
    queryFn: async () => {
      const [allPaymentsRes, todayPaymentsRes, chitsRes] = await Promise.all([
        supabase
          .from('payments')
          .select('amount', { count: 'exact' })
          .eq('recorded_by', user!.id),
        supabase
          .from('payments')
          .select('amount', { count: 'exact' })
          .eq('recorded_by', user!.id)
          .gte('payment_date', todayStr),
        supabase
          .from('customer_chits')
          .select('id', { count: 'exact' })
          .eq('enrolled_by', user!.id),
      ])

      const totalCollected = (allPaymentsRes.data as any[] || []).reduce((s, p) => s + (p.amount || 0), 0)
      const todayCollected = (todayPaymentsRes.data as any[] || []).reduce((s, p) => s + (p.amount || 0), 0)
      const totalEnrolments = chitsRes.error ? 0 : (chitsRes.count || 0)

      return {
        totalCollected,
        totalPayments: allPaymentsRes.count || 0,
        todayCollected,
        todayPayments: todayPaymentsRes.count || 0,
        totalEnrolments,
      }
    },
    enabled: !!user,
    refetchInterval: 5000,
  })

  // ── Fetch recent activity by this user ─────────────────────────
  const { data: myActivity = [] } = useQuery({
    queryKey: ['my-activity', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('id, amount, payment_date, payment_mode, customer:customers(name), customer_chit:customer_chits(scheme:chit_schemes(name))')
        .eq('recorded_by', user!.id)
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return data as any[]
    },
    enabled: !!user,
    refetchInterval: 5000,
  })

  // ── Update profile mutation ─────────────────────────────────────
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim(), phone: phone.trim() })
        .eq('id', user!.id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Profile updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setEditing(false)
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update profile'),
  })

  // ── Change password mutation ────────────────────────────────────
  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) throw new Error('Passwords do not match')
      if (newPassword.length < 8) throw new Error('Password must be at least 8 characters')
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (err: any) => toast.error(err.message || 'Failed to change password'),
  })

  // ── Avatar upload ───────────────────────────────────────────────
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setAvatarUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `avatars/${user.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Avatar updated!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload avatar')
    } finally {
      setAvatarUploading(false)
    }
  }

  const roleColor = profile?.role === 'admin'
    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
    : 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30'

  const roleIcon = profile?.role === 'admin' ? ShieldCheck : UserCheck2

  const RoleIcon = roleIcon

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* ── Hero Banner ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-2xl shadow-2xl"
      >
        {/* Gold gradient background */}
        <div className="h-48 bg-gradient-to-br from-amber-600 via-yellow-500 to-amber-400 relative">
          {/* Decorative circles */}
          <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute top-8 -left-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
          <div className="absolute bottom-0 left-1/3 h-20 w-64 rounded-full bg-amber-900/20 blur-2xl" />

          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* Top right role badge */}
          <div className="absolute top-4 right-5">
            <Badge variant="outline" className="bg-white/20 text-white border-white/30 font-bold text-xs uppercase px-3 py-1 backdrop-blur-sm">
              <RoleIcon className="h-3 w-3 mr-1" />
              {profile?.role || 'Admin'}
            </Badge>
          </div>
        </div>

        {/* Profile info overlapping banner */}
        <div className="bg-card px-6 pb-5 pt-0 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12">
            {/* Avatar with upload button */}
            <div className="relative shrink-0">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative"
              >
                <Avatar className="h-24 w-24 border-4 border-card shadow-2xl ring-4 ring-amber-500/30">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-2xl font-extrabold bg-gradient-to-br from-amber-500 to-yellow-600 text-white">
                    {getInitials(profile?.full_name || 'Admin')}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-lg transition-all hover:scale-110"
                  title="Change avatar"
                >
                  {avatarUploading
                    ? <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Camera className="h-3.5 w-3.5" />
                  }
                </button>
              </motion.div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            {/* Name and meta */}
            <div className="flex-1 min-w-0 pt-14 sm:pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h1 className="font-heading text-2xl font-extrabold text-foreground">
                    {profile?.full_name || 'Admin User'}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={`text-[10px] font-bold uppercase ${roleColor}`}>
                      <RoleIcon className="h-3 w-3 mr-1" />
                      {profile?.role || 'admin'}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      Member since {profile?.created_at ? formatDate(profile.created_at) : '—'}
                    </span>
                  </div>
                </div>
                {!editing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFullName(profile?.full_name || '')
                      setPhone(profile?.phone || '')
                      setEditing(true)
                    }}
                    className="gap-2 border-amber-500/30 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 self-start sm:self-auto"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Performance Stats ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          {
            icon: IndianRupee,
            label: "Today's Collection",
            value: formatINR(stats?.todayCollected || 0),
            sub: `${stats?.todayPayments || 0} payments today • Total: ${formatINR(stats?.totalCollected || 0)}`,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10 border-amber-500/20',
          },
          {
            icon: Layers,
            label: 'Enrolments Done',
            value: stats?.totalEnrolments || 0,
            sub: 'Customers enrolled',
            color: 'text-blue-500',
            bg: 'bg-blue-500/10 border-blue-500/20',
          },
          {
            icon: Star,
            label: 'Role Level',
            value: profile?.role === 'admin' ? 'Admin' : 'Staff',
            sub: profile?.is_active ? 'Active Account' : 'Inactive',
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10 border-emerald-500/20',
          },
        ].map((stat, i) => {
          const StatIcon = stat.icon
          return (
            <motion.div
              key={stat.label}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ y: -4, scale: 1.02 }}
            >
              <Card className={`p-5 border ${stat.bg} shadow-sm hover:shadow-lg transition-all`}>
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${stat.bg}`}>
                    <StatIcon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                    <p className={`text-xl font-extrabold mt-0.5 ${stat.color}`}>{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{stat.sub}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* ── Main Content Tabs ───────────────────────────────────── */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full h-11 bg-muted/60 p-1 mb-5 justify-start">
          <TabsTrigger value="profile" className="gap-2 text-xs md:text-sm">
            <User className="h-4 w-4" /> Personal Info
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 text-xs md:text-sm">
            <Lock className="h-4 w-4" /> Security
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2 text-xs md:text-sm">
            <TrendingUp className="h-4 w-4" /> My Activity
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: Personal Info ─────────────────────────────── */}
        <TabsContent value="profile">
          <Card className="p-6 space-y-6 shadow-md border-border/60">
            <div className="flex items-center gap-3 border-b border-border/50 pb-4">
              <div className="h-9 w-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <User className="h-4.5 w-4.5 text-amber-500" />
              </div>
              <div>
                <h2 className="font-heading font-bold text-base text-foreground">Personal Information</h2>
                <p className="text-xs text-muted-foreground">Update your name and contact details</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                {editing ? (
                  <Input
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="h-10"
                  />
                ) : (
                  <div className="flex items-center gap-2 h-10 px-3 bg-muted/40 rounded-lg border border-border/40 text-sm font-medium text-foreground">
                    {profile?.full_name || '—'}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                {editing ? (
                  <Input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    className="h-10"
                  />
                ) : (
                  <div className="flex items-center gap-2 h-10 px-3 bg-muted/40 rounded-lg border border-border/40 text-sm font-medium text-foreground">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    {profile?.phone || '—'}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                <div className="flex items-center gap-2 h-10 px-3 bg-muted/40 rounded-lg border border-border/40 text-sm font-medium text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  {profile?.email || user?.email || '—'}
                  <Badge className="ml-auto text-[9px] px-1.5 bg-muted text-muted-foreground border">Read-only</Badge>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Account Role</Label>
                <div className="flex items-center gap-2 h-10 px-3 bg-muted/40 rounded-lg border border-border/40 text-sm font-medium text-muted-foreground">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="capitalize">{profile?.role || '—'}</span>
                  <Badge className="ml-auto text-[9px] px-1.5 bg-muted text-muted-foreground border">Read-only</Badge>
                </div>
              </div>
            </div>

            {editing && (
              <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                <Button
                  onClick={() => updateProfileMutation.mutate()}
                  disabled={updateProfileMutation.isPending}
                  className="gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white shadow-lg"
                >
                  {updateProfileMutation.isPending
                    ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Save className="h-4 w-4" />
                  }
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ── TAB 2: Security ──────────────────────────────────── */}
        <TabsContent value="security">
          <Card className="p-6 space-y-6 shadow-md border-border/60">
            <div className="flex items-center gap-3 border-b border-border/50 pb-4">
              <div className="h-9 w-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <Lock className="h-4.5 w-4.5 text-blue-500" />
              </div>
              <div>
                <h2 className="font-heading font-bold text-base text-foreground">Change Password</h2>
                <p className="text-xs text-muted-foreground">Keep your account safe with a strong password</p>
              </div>
            </div>

            <div className="max-w-md space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">New Password</Label>
                <div className="relative">
                  <Input
                    type={showNewPwd ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {newPassword.length > 0 && newPassword.length < 8 && (
                  <p className="text-xs text-destructive">Password must be at least 8 characters</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Confirm Password</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPwd ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
                {confirmPassword.length > 0 && newPassword === confirmPassword && newPassword.length >= 8 && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Passwords match
                  </p>
                )}
              </div>

              <Button
                onClick={() => changePasswordMutation.mutate()}
                disabled={
                  changePasswordMutation.isPending ||
                  newPassword.length < 8 ||
                  newPassword !== confirmPassword
                }
                className="w-full gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg mt-2"
              >
                {changePasswordMutation.isPending
                  ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Lock className="h-4 w-4" />
                }
                Update Password
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* ── TAB 3: My Activity ───────────────────────────────── */}
        <TabsContent value="activity">
          <Card className="p-6 shadow-md border-border/60">
            <div className="flex items-center gap-3 border-b border-border/50 pb-4 mb-4">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <TrendingUp className="h-4.5 w-4.5 text-emerald-500" />
              </div>
              <div>
                <h2 className="font-heading font-bold text-base text-foreground">My Recent Activity</h2>
                <p className="text-xs text-muted-foreground">Payments you have recorded recently</p>
              </div>
            </div>

            {myActivity.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <TrendingUp className="h-8 w-8 mx-auto mb-3 opacity-30" />
                <p>No activity recorded yet.</p>
                <p className="mt-1">Payments you collect will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myActivity.map((act, idx) => (
                  <motion.div
                    key={act.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted/50 transition-all text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                        <IndianRupee className="h-4 w-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{act.customer?.name || 'Customer'}</p>
                        <p className="text-muted-foreground text-[10px]">{act.customer_chit?.scheme?.name || 'Chit Plan'}</p>
                      </div>
                    </div>
                    <div className="text-right space-y-0.5">
                      <p className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        +{formatINR(act.amount)}
                      </p>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="uppercase font-bold text-[9px] px-1.5 py-0.5 rounded bg-muted">
                          {act.payment_mode}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <Calendar className="h-3 w-3" />
                          {formatDate(act.payment_date)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
