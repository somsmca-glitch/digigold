import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Customer, CustomerChit, Payment, Scheme } from '@/types/database'
import { Button } from '@/components/ui/button'
import { GoldButton } from '@/components/ui/gold-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
import { formatINR, formatDate, formatDateTime, getInitials } from '@/lib/utils'
import {
  ArrowLeft, ArrowRight, Phone, MapPin, Plus, IndianRupee, Layers, Calendar, CheckCircle2,
  Edit, User, Home, CreditCard, Fingerprint, History, Printer, Download, Sparkles, AlertCircle,
  FileText, ShieldCheck, Clock, Coins, ChevronRight, Search, Award, LayoutGrid,
  ListOrdered, Sparkle, Smartphone, Banknote, Building2, Zap, Receipt, Lock, Gift, Heart, UserCheck2,
  Trash2, AlertTriangle
} from 'lucide-react'
import { exportCSV } from './reports/reportUtils'

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  // Modal States
  const [openPayment, setOpenPayment] = useState(false)
  const [openEnroll, setOpenEnroll] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [activeReceiptPayment, setActiveReceiptPayment] = useState<any | null>(null)

  // Passbook View Mode: 'simple' | 'detailed'
  const [passbookMode, setPassbookMode] = useState<'simple' | 'detailed'>('simple')

  // Payment Form State
  const [selectedChitId, setSelectedChitId] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'bank_transfer' | 'cheque'>('upi')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  // Enroll Form State
  const [schemeId, setSchemeId] = useState('')
  const [agreedAmount, setAgreedAmount] = useState('')
  const [dueDay, setDueDay] = useState('10')

  // Multi-step Edit Customer Form State
  const [editStep, setEditStep] = useState(1)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editAltPhone, setEditAltPhone] = useState('')
  const [editDob, setEditDob] = useState('')
  const [editAnniversaryDate, setEditAnniversaryDate] = useState('')
  const [editDoorNo, setEditDoorNo] = useState('')
  const [editFlatName, setEditFlatName] = useState('')
  const [editStreet, setEditStreet] = useState('')
  const [editLandmark, setEditLandmark] = useState('')
  const [editArea, setEditArea] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editState, setEditState] = useState('')
  const [editPincode, setEditPincode] = useState('')
  const [editIdType, setEditIdType] = useState('')
  const [editIdNumber, setEditIdNumber] = useState('')
  const [editNomineeName, setEditNomineeName] = useState('')
  const [editNomineeRelationship, setEditNomineeRelationship] = useState('')
  const [editNomineePhone, setEditNomineePhone] = useState('')
  const [editBankName, setEditBankName] = useState('')
  const [editAccountNumber, setEditAccountNumber] = useState('')
  const [editIfscCode, setEditIfscCode] = useState('')
  const [editBankBranch, setEditBankBranch] = useState('')

  // Search in payments
  const [paymentSearch, setPaymentSearch] = useState('')

  // ── Fetch Customer Data ──────────────────────────────────────────
  const { data: customer, isLoading: loadingCustomer } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*').eq('id', id!).single()
      if (error) throw error
      return data as Customer
    },
    enabled: !!id,
  })

  // Multi-step Edit Customer Form State
  const [checkingEditPhone, setCheckingEditPhone] = useState(false)
  const [editPhoneError, setEditPhoneError]       = useState('')

  // Synchronously populate edit form fields when opening edit modal
  const handleOpenEditModal = () => {
    if (customer) {
      setEditStep(1)
      setCheckingEditPhone(false)
      setEditPhoneError('')
      const nameParts = (customer.name || '').trim().split(' ')
      setEditFirstName(customer.first_name || nameParts[0] || '')
      setEditLastName(customer.last_name || nameParts.slice(1).join(' ') || '')
      setEditPhone(customer.phone || '')
      setEditDob((customer as any).dob || '')
      setEditAnniversaryDate((customer as any).anniversary_date || '')
      setEditDoorNo(customer.door_no || '')
      setEditFlatName((customer as any).flat_name || '')
      setEditStreet(customer.street || '')
      setEditLandmark((customer as any).landmark || '')
      setEditArea(customer.area || '')
      setEditCity(customer.city || '')
      setEditState((customer as any).state || '')
      setEditPincode(customer.pincode || '')
      setEditAltPhone((customer as any).alt_phone || (customer as any).secondary_phone || '')
      setEditIdType((customer as any).id_type || '')
      setEditIdNumber((customer as any).id_number || customer.id_proof_url || '')
      setEditNomineeName((customer as any).nominee_name || '')
      setEditNomineeRelationship((customer as any).nominee_relationship || '')
      setEditNomineePhone((customer as any).nominee_phone || '')
      setEditBankName((customer as any).bank_name || '')
      setEditAccountNumber((customer as any).account_number || '')
      setEditIfscCode((customer as any).ifsc_code || '')
      setEditBankBranch((customer as any).bank_branch || '')
    }
    setOpenEdit(true)
  }

  const handleEditNextStep1 = async () => {
    const cleanPhone = editPhone.trim()
    if (cleanPhone.length !== 10 || !/^\d{10}$/.test(cleanPhone)) {
      setEditPhoneError('Mobile number must be exactly 10 numeric digits')
      toast.error('Mobile number must be exactly 10 digits')
      return
    }

    if (cleanPhone !== (customer?.phone || '').trim()) {
      setCheckingEditPhone(true)
      setEditPhoneError('')
      try {
        const { data } = await supabase
          .from('customers')
          .select('id, name')
          .eq('phone', cleanPhone)
          .neq('id', id!)
          .maybeSingle()

        if (data) {
          const msg = `Mobile number ${cleanPhone} is already registered to another customer (${data.name || 'Existing'}).`
          setEditPhoneError(msg)
          toast.error(msg)
          return
        }
      } catch (err) {
        toast.error('Failed to verify mobile number in database.')
      } finally {
        setCheckingEditPhone(false)
      }
    }
    setEditStep(2)
  }

  const handleEditPincodeChange = (val: string) => {
    setEditPincode(val.replace(/[^0-9]/g, '').slice(0, 6))
  }

  const handleEditIdNumberChange = (val: string) => {
    if (editIdType === 'aadhaar') {
      setEditIdNumber(val.replace(/[^0-9]/g, '').slice(0, 12))
    } else if (editIdType === 'pan') {
      setEditIdNumber(val.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10))
    } else {
      setEditIdNumber(val.replace(/[^A-Za-z0-9\-\/]/g, '').toUpperCase().slice(0, 16))
    }
  }

  const isEditPincodeValid = editPincode.trim().length === 6 && /^\d{6}$/.test(editPincode.trim())
  const isEditIdValid = editIdType.trim().length > 0 && (
    editIdType === 'aadhaar' ? /^\d{12}$/.test(editIdNumber.trim()) :
    editIdType === 'pan' ? /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(editIdNumber.trim()) :
    editIdNumber.trim().length >= 4
  )

  // ── Fetch Enrolled Chits ──────────────────────────────────────────
  const { data: chits = [], isLoading: loadingChits } = useQuery({
    queryKey: ['customer-chits', id],
    queryFn: async () => {
      let { data, error } = await supabase
        .from('customer_chits')
        .select('*, scheme:chit_schemes(*), enroller:profiles!enrolled_by(full_name, role)')
        .eq('customer_id', id!)
        .order('created_at', { ascending: false })

      if (error) {
        // Fallback query if enrolled_by column is missing in Supabase DB schema
        const fallback = await supabase
          .from('customer_chits')
          .select('*, scheme:chit_schemes(*)')
          .eq('customer_id', id!)
          .order('created_at', { ascending: false })
        if (fallback.error) throw fallback.error
        data = fallback.data as any
      }

      return data as (CustomerChit & { scheme?: Scheme; enroller?: { full_name: string; role: string } })[]
    },
    enabled: !!id,
  })

  // ── Fetch Payments ───────────────────────────────────────────────
  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['customer-payments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, customer_chit:customer_chits(scheme:chit_schemes(name)), recorder:profiles!recorded_by(full_name, role)')
        .eq('customer_id', id!)
        .order('payment_date', { ascending: true }) // ascending for running subtotal
      if (error) throw error
      return data as (Payment & { customer_chit?: { scheme?: { name: string } }; recorder?: { full_name: string; role: string } })[]
    },
    enabled: !!id,
  })

  // ── Fetch Active Schemes ─────────────────────────────────────────
  const { data: schemes = [] } = useQuery({
    queryKey: ['schemes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('chit_schemes').select('*')
      if (error) throw error
      return data as Scheme[]
    },
  })

  // Auto-select initial chit when payment modal opens or chits load
  useEffect(() => {
    if (openPayment && chits.length > 0) {
      const valid = chits.find(c => c.id === selectedChitId)
      if (!selectedChitId || !valid) {
        const first = chits[0]
        setSelectedChitId(first.id)
        setPayAmount((first.agreed_amount || first.scheme?.min_installment || 0).toString())
      }
    }
  }, [openPayment, chits, selectedChitId])

  // Selected chit analytics for Payment Modal
  const selectedChit = chits.find(c => c.id === selectedChitId) || (chits.length > 0 ? chits[0] : null)
  const selectedChitPayments = payments.filter(p => p.customer_chit_id === (selectedChit?.id || ''))
  const selectedChitPaid = selectedChitPayments.reduce((s, p) => s + (p.amount || 0), 0)
  const selectedMonthlyDue = selectedChit?.agreed_amount || selectedChit?.scheme?.min_installment || 0
  const selectedDuration = selectedChit?.scheme?.duration_months || 11
  const selectedTarget = selectedMonthlyDue * selectedDuration

  // ── Record Payment Mutation ──────────────────────────────────────
  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedChitId) throw new Error('Please select an enrolled scheme plan')
      const amountToRecord = selectedMonthlyDue || parseFloat(payAmount) || 0
      const { data, error } = await supabase.from('payments').insert({
        customer_id: id!,
        customer_chit_id: selectedChitId,
        amount: amountToRecord,
        payment_mode: paymentMode,
        payment_date: paymentDate || new Date().toISOString().split('T')[0],
        recorded_by: user?.id || null,
        notes,
      }).select().single()

      if (error) throw error
      return data
    },
    onSuccess: (data: any) => {
      toast.success(`Payment recorded successfully!`)
      queryClient.invalidateQueries({ queryKey: ['customer-payments', id] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] })
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] })
      queryClient.invalidateQueries({ queryKey: ['my-activity'] })
      queryClient.invalidateQueries({ queryKey: ['profile-stats'] })
      setOpenPayment(false)
      setPayAmount('')
      setNotes('')
      setActiveReceiptPayment({
        ...data,
        customer,
        customer_chit: chits.find(c => c.id === selectedChitId),
      })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to record payment')
    },
  })

  // ── Enroll Scheme Mutation ───────────────────────────────────────
  const enrollSchemeMutation = useMutation({
    mutationFn: async () => {
      const scheme = schemes.find((s) => s.id === schemeId)
      if (!scheme) throw new Error('Selected scheme not found')

      const enteredAmount = parseFloat(agreedAmount) || 0
      if (enteredAmount < scheme.min_installment) {
        throw new Error(`Monthly installment must be at least ${formatINR(scheme.min_installment)} for ${scheme.name}`)
      }

      const today = new Date()
      const startDateStr = today.toISOString().split('T')[0]
      const maturity = new Date(today)
      maturity.setMonth(maturity.getMonth() + scheme.duration_months)

      const insertPayload: any = {
        customer_id: id!,
        scheme_id: schemeId,
        start_date: startDateStr,
        maturity_date: maturity.toISOString().split('T')[0],
        monthly_due_day: parseInt(dueDay),
        agreed_amount: enteredAmount,
        status: 'active',
        enrolled_by: user?.id || null,
      }

      let { data, error } = await supabase.from('customer_chits').insert(insertPayload).select().single()

      if (error && error.message?.includes('enrolled_by')) {
        delete insertPayload.enrolled_by
        const fallback = await supabase.from('customer_chits').insert(insertPayload).select().single()
        data = fallback.data
        error = fallback.error
      }

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Customer enrolled in scheme successfully!')
      queryClient.invalidateQueries({ queryKey: ['customer-chits', id] })
      queryClient.invalidateQueries({ queryKey: ['live-activity-feed'] })
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] })
      queryClient.invalidateQueries({ queryKey: ['my-activity'] })
      queryClient.invalidateQueries({ queryKey: ['profile-stats'] })
      setOpenEnroll(false)
      setAgreedAmount('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to enroll in scheme')
    },
  })

  // ── Update Customer Mutation ─────────────────────────────────────
  const updateCustomerMutation = useMutation({
    mutationFn: async () => {
      const cleanPhone = editPhone.trim()
      if (cleanPhone.length !== 10 || !/^\d{10}$/.test(cleanPhone)) {
        throw new Error('Mobile number must be exactly 10 numeric digits!')
      }

      if (cleanPhone !== (customer?.phone || '').trim()) {
        const { data: existing } = await supabase
          .from('customers')
          .select('id, name')
          .eq('phone', cleanPhone)
          .neq('id', id!)
          .maybeSingle()

        if (existing) {
          throw new Error(`Mobile number ${cleanPhone} is already registered to another customer (${existing.name})!`)
        }
      }

      const fullName = [editFirstName, editLastName].filter(Boolean).join(' ')
      const fullAddress = [editDoorNo, editFlatName, editStreet, editLandmark, editArea, editCity, editState, editPincode].filter(Boolean).join(', ')
      const updatePayload: any = {
        name: fullName || editFirstName,
        first_name: editFirstName,
        last_name: editLastName || null,
        phone: cleanPhone,
        dob: editDob || null,
        anniversary_date: editAnniversaryDate || null,
        address: fullAddress || null,
        door_no: editDoorNo || null,
        flat_name: editFlatName || null,
        street: editStreet || null,
        landmark: editLandmark || null,
        area: editArea || null,
        city: editCity || null,
        state: editState || null,
        pincode: editPincode || null,
        nominee_name: editNomineeName || null,
        nominee_relationship: editNomineeRelationship || null,
        nominee_phone: editNomineePhone || null,
        bank_name: editBankName || null,
        account_number: editAccountNumber || null,
        ifsc_code: editIfscCode ? editIfscCode.toUpperCase() : null,
        bank_branch: editBankBranch || null,
        updated_at: new Date().toISOString(),
      }
      if (editAltPhone) updatePayload.alt_phone = editAltPhone
      if (editIdType) updatePayload.id_type = editIdType
      if (editIdNumber) updatePayload.id_number = editIdNumber

      let { data, error } = await supabase.from('customers').update(updatePayload).eq('id', id!).select().single()

      if (error) {
        const errStr = (error.message + ' ' + (error.details || '') + ' ' + (error.hint || '')).toLowerCase()
        if (
          errStr.includes('flat') ||
          errStr.includes('landmark') ||
          errStr.includes('state') ||
          errStr.includes('dob') ||
          errStr.includes('anniversary') ||
          errStr.includes('alt_phone') ||
          errStr.includes('id_type') ||
          errStr.includes('id_number') ||
          errStr.includes('nominee') ||
          errStr.includes('bank') ||
          errStr.includes('account') ||
          errStr.includes('ifsc') ||
          errStr.includes('branch') ||
          errStr.includes('column') ||
          errStr.includes('pgrst204')
        ) {
          delete updatePayload.flat_name
          delete updatePayload.landmark
          delete updatePayload.state
          delete updatePayload.dob
          delete updatePayload.anniversary_date
          delete updatePayload.alt_phone
          delete updatePayload.id_type
          delete updatePayload.id_number
          delete updatePayload.nominee_name
          delete updatePayload.nominee_relationship
          delete updatePayload.nominee_phone
          delete updatePayload.bank_name
          delete updatePayload.account_number
          delete updatePayload.ifsc_code
          delete updatePayload.bank_branch
          const fallback = await supabase.from('customers').update(updatePayload).eq('id', id!).select().single()
          data = fallback.data
          error = fallback.error
        }
      }

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Customer profile updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['customer', id] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setOpenEdit(false)
      setEditStep(1)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update profile')
    },
  })

  // ── Toggle Customer Verification Mutation ────────────────────────
  const toggleVerificationMutation = useMutation({
    mutationFn: async (newStatus: boolean) => {
      const { error: customerErr } = await supabase
        .from('customers')
        .update({ is_verified: newStatus } as any)
        .eq('id', id!)

      if (customerErr) console.warn('Customer verification update notice:', customerErr.message)

      if (customer?.phone) {
        await supabase
          .from('profiles')
          .update({ is_verified: newStatus } as any)
          .eq('phone', customer.phone)
      }

      localStorage.setItem(`customer_verified_${id}`, newStatus.toString())
    },
    onSuccess: (_, newStatus) => {
      toast.success(newStatus ? 'Customer account verified successfully!' : 'Verification status updated.')
      queryClient.invalidateQueries({ queryKey: ['customer', id] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update verification status'),
  })

  // ── Delete Customer Mutation (Admin Only) ─────────────────────────
  const navigate = useNavigate()
  const { role, profile, user: currentUser } = useAuth()
  const isAdmin = role === 'admin' || profile?.role === 'admin' || (role as string) === 'superadmin' || (profile?.role as string) === 'superadmin'

  const [openDeleteModal, setOpenDeleteModal] = useState(false)
  const [deleteNote, setDeleteNote]           = useState('')

  const deleteCustomerMutation = useMutation({
    mutationFn: async () => {
      if (!isAdmin) {
        throw new Error('Unauthorized: Only admin users can delete customer records.')
      }
      if (!deleteNote.trim()) {
        throw new Error('A deletion reason/note is mandatory.')
      }

      // Record activity log if available
      try {
        await supabase.from('activity_logs').insert({
          user_id: currentUser?.id || null,
          action: 'DELETE_CUSTOMER',
          details: `Deleted customer ${customer?.name} (${customer?.phone}). Reason: ${deleteNote.trim()}`,
          created_at: new Date().toISOString(),
        })
      } catch (e) {
        // ignore log table errors
      }

      // Delete payments and chits related to customer
      await supabase.from('payments').delete().eq('customer_id', id!)
      await supabase.from('customer_chits').delete().eq('customer_id', id!)
      const { error } = await supabase.from('customers').delete().eq('id', id!)

      if (error) throw error
      return true
    },
    onSuccess: () => {
      toast.success(`Customer ${customer?.name || ''} deleted successfully!`)
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] })
      setOpenDeleteModal(false)
      navigate('/admin/customers')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete customer')
    },
  })

  // ── Calculations ─────────────────────────────────────────────────
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const activeChits = chits.filter(c => c.status === 'active')
  const totalTargetValue = chits.reduce((sum, c) => {
    const monthly = c.agreed_amount || 0
    const duration = c.scheme?.duration_months || 11
    return sum + (monthly * duration)
  }, 0)

  // Payments descending for payment history table tab
  const descPayments = [...payments].reverse()
  const filteredPayments = descPayments.filter(p =>
    p.notes?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
    p.payment_mode.toLowerCase().includes(paymentSearch.toLowerCase()) ||
    p.amount.toString().includes(paymentSearch)
  )

  if (loadingCustomer) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="p-12 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold">Customer Not Found</h2>
        <p className="text-muted-foreground text-sm">The requested customer record does not exist or was deleted.</p>
        <Link to="/admin/customers">
          <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Back to Customers</Button>
        </Link>
      </div>
    )
  }

  const formattedAddress = [customer.door_no, customer.street, customer.area, customer.city, customer.pincode]
    .filter(Boolean)
    .join(', ') || customer.address || 'Address not recorded'

  const isCustomerVerified = customer.is_verified ?? (localStorage.getItem(`customer_verified_${id}`) !== 'false')

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar Navigation (Hidden in print) */}
      <div className="flex items-center justify-between gap-4 no-print">
        <Link to="/admin/customers">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Customers
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {/* Admin Verify Customer Button */}
          <Button
            variant={isCustomerVerified ? "outline" : "default"}
            size="sm"
            onClick={() => toggleVerificationMutation.mutate(!isCustomerVerified)}
            disabled={toggleVerificationMutation.isPending}
            className={`gap-1.5 text-xs font-bold ${
              isCustomerVerified
                ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {isCustomerVerified ? 'Unverify Account' : 'Verify Account'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleOpenEditModal}
          >
            <Edit className="h-3.5 w-3.5" /> Edit Profile
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
            onClick={() => window.print()}
          >
            <Printer className="h-3.5 w-3.5" /> Print Active Passbook
          </Button>

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:border-red-500/50 font-semibold"
              onClick={() => { setDeleteNote(''); setOpenDeleteModal(true); }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Customer
            </Button>
          )}
        </div>
      </div>

      {/* Hero Customer Profile Card with Hover Effects (Hidden in print) */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className="no-print"
      >
        <Card className="relative overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-background p-6 md:p-8 shadow-md hover:shadow-xl hover:border-amber-500/50 transition-all duration-300">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-5 w-full md:w-auto">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-amber-500/40 shadow-xl shrink-0">
                <AvatarImage src={customer.photo_url ?? undefined} />
                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-yellow-600 text-white font-bold text-xl sm:text-2xl">
                  {getInitials(customer.name)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                  <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                    {customer.name}
                  </h1>
                  {isCustomerVerified ? (
                    <Badge className="bg-emerald-500 text-white border border-emerald-400 font-extrabold text-xs px-2.5 py-0.5 shadow-sm gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-white" /> Verified Account
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-bold text-xs px-2.5 py-0.5 gap-1">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> Pending Verification
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 text-xs md:text-sm text-muted-foreground pt-1">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Phone className="h-3.5 w-3.5 text-amber-500" /> {customer.phone}
                  </span>
                  {(customer as any).dob && (
                    <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                      <Gift className="h-3.5 w-3.5 text-amber-500" /> DOB: {formatDate((customer as any).dob)}
                    </span>
                  )}
                  {(customer as any).anniversary_date && (
                    <span className="flex items-center gap-1.5 text-pink-700 dark:text-pink-400 font-semibold bg-pink-500/10 px-2 py-0.5 rounded-md border border-pink-500/20">
                      <Heart className="h-3.5 w-3.5 text-pink-500" /> Anniversary: {formatDate((customer as any).anniversary_date)}
                    </span>
                  )}
                  {(customer.city || customer.area) && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-amber-500" />
                      {[customer.area, customer.city].filter(Boolean).join(', ')}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-amber-500" /> Enrolled {formatDate(customer.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
              <Button
                variant="outline"
                onClick={() => setOpenEnroll(true)}
                className="flex-1 md:flex-initial gap-2 border-amber-500/40 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400"
              >
                <Layers className="h-4 w-4" /> Enroll Scheme
              </Button>
              <GoldButton
                onClick={() => {
                  if (chits.length > 0) {
                    setSelectedChitId(chits[0].id)
                    setPayAmount((chits[0].agreed_amount || chits[0].scheme?.min_installment || 0).toString())
                  }
                  setOpenPayment(true)
                }}
                className="flex-1 md:flex-initial gap-2 shadow-lg shadow-amber-500/20"
              >
                <IndianRupee className="h-4 w-4" /> Record Payment
              </GoldButton>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* KPI Overview Cards with Hover Scale (Hidden in print) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          whileHover={{ y: -3, scale: 1.02 }}
          className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-4 space-y-1 transition-shadow hover:shadow-lg hover:shadow-amber-500/10"
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Paid</p>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{formatINR(totalPaid)}</p>
          <p className="text-[10px] text-muted-foreground">{payments.length} transactions recorded</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          whileHover={{ y: -3, scale: 1.02 }}
          className="rounded-xl border border-border bg-card p-4 space-y-1 transition-shadow hover:shadow-lg"
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Active Schemes</p>
          <p className="text-2xl font-extrabold text-foreground">{activeChits.length} <span className="text-xs font-normal text-muted-foreground">of {chits.length} total</span></p>
          <p className="text-[10px] text-muted-foreground">{chits.length - activeChits.length} completed/redeemed</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          whileHover={{ y: -3, scale: 1.02 }}
          className="rounded-xl border border-border bg-card p-4 space-y-1 transition-shadow hover:shadow-lg"
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Target Savings</p>
          <p className="text-2xl font-extrabold text-foreground">{formatINR(totalTargetValue)}</p>
          <p className="text-[10px] text-muted-foreground">Total maturity target across schemes</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          whileHover={{ y: -3, scale: 1.02 }}
          className="rounded-xl border border-border bg-card p-4 space-y-1 transition-shadow hover:shadow-lg"
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Savings Progress</p>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {totalTargetValue > 0 ? `${Math.min(100, Math.round((totalPaid / totalTargetValue) * 100))}%` : '0%'}
          </p>
          <p className="text-[10px] text-muted-foreground">Target completion percentage</p>
        </motion.div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="passbook" className="w-full">
        <TabsList className="w-full justify-start h-11 bg-muted/60 p-1 mb-6 overflow-x-auto no-print">
          <TabsTrigger value="passbook" className="gap-2 text-xs md:text-sm">
            <FileText className="h-4 w-4" /> Passbook Statement
          </TabsTrigger>
          <TabsTrigger value="schemes" className="gap-2 text-xs md:text-sm">
            <Layers className="h-4 w-4" /> Enrolled Schemes ({chits.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2 text-xs md:text-sm">
            <History className="h-4 w-4" /> Payment History ({payments.length})
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2 text-xs md:text-sm">
            <User className="h-4 w-4" /> Full Profile & Address
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: PASSBOOK STATEMENT (WITH 2 VIEWS + PRINT) ──────────────── */}
        <TabsContent value="passbook" className="space-y-4">
          {/* Controls Bar for 2 Views + Print */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 rounded-xl bg-card border border-border shadow-sm no-print">
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-muted/60 border border-border/60">
              <button
                onClick={() => setPassbookMode('simple')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  passbookMode === 'simple'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> 1. Simple Summary View
              </button>
              <button
                onClick={() => setPassbookMode('detailed')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  passbookMode === 'detailed'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <ListOrdered className="h-3.5 w-3.5" /> 2. Detailed Scheme Ledgers
              </button>
            </div>

            <Button
              onClick={() => window.print()}
              className="gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white shadow-lg text-xs"
            >
              <Printer className="h-4 w-4" /> Print Active Passbook View
            </Button>
          </div>

          {/* PRINTABLE PASSBOOK CONTAINER — Isolated for window.print() */}
          <div
            id="printable-passbook"
            className="p-6 md:p-10 max-w-4xl mx-auto border-2 border-amber-500/40 bg-card rounded-2xl shadow-2xl space-y-8 text-foreground"
          >
            {/* Header branding */}
            <div className="flex items-start justify-between border-b-2 border-amber-500/30 pb-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-white flex items-center justify-center font-bold text-lg shadow">
                    DG
                  </div>
                  <h2 className="font-heading text-2xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400">
                    DigiGold Jewellers
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                  Official Gold Chit Scheme Passbook Statement ({passbookMode === 'simple' ? 'Summary View' : 'Detailed Ledger'})
                </p>
                <p className="text-[11px] text-muted-foreground">GSTIN: 33AAAAA0000A1Z5 • Reg. No: DG/2026/CHIT</p>
              </div>
              <div className="text-right space-y-1">
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs px-3 py-1 font-bold">
                  Official Statement
                </Badge>
                <p className="text-[11px] text-muted-foreground pt-1">
                  Printed: <span className="font-semibold text-foreground">{formatDate(new Date().toISOString())}</span>
                </p>
              </div>
            </div>

            {/* Customer Details Summary Box */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 rounded-xl bg-amber-500/8 border border-amber-500/25 text-xs">
              <div className="space-y-1">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Member Account</p>
                <p className="text-base font-extrabold text-foreground">{customer.name}</p>
                <p className="text-muted-foreground font-medium">Phone: <span className="text-foreground font-semibold">{customer.phone}</span></p>
                <p className="text-muted-foreground">Customer ID: <span className="font-mono text-[11px] text-foreground">{customer.id}</span></p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Registered Address</p>
                <p className="text-foreground font-medium leading-relaxed">{formattedAddress}</p>
                <p className="text-muted-foreground">Member Since: <span className="text-foreground font-semibold">{formatDate(customer.created_at)}</span></p>
              </div>
              {((customer as any).nominee_name || (customer as any).nominee_relationship) && (
                <div className="space-y-1 border-t md:border-t-0 md:border-l border-amber-500/20 pt-2 md:pt-0 md:pl-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400">Nominee Details</p>
                  <p className="text-sm font-extrabold text-foreground">{(customer as any).nominee_name || 'Nominee Recorded'}</p>
                  {(customer as any).nominee_relationship && (
                    <Badge variant="outline" className="text-[10px] font-bold border-amber-500/40 text-amber-600 dark:text-amber-400 px-2 py-0.5 mt-0.5">
                      {(customer as any).nominee_relationship}
                    </Badge>
                  )}
                  {(customer as any).nominee_phone && (
                    <p className="text-[11px] text-muted-foreground pt-0.5">Phone: {(customer as any).nominee_phone}</p>
                  )}
                </div>
              )}
              {((customer as any).bank_name || (customer as any).account_number) && (
                <div className="space-y-1 border-t md:border-t-0 md:border-l border-amber-500/20 pt-2 md:pt-0 md:pl-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CreditCard className="h-3 w-3" /> Bank Account
                  </p>
                  <p className="text-sm font-extrabold text-foreground">{(customer as any).bank_name || 'Bank Recorded'}</p>
                  {(customer as any).account_number && (
                    <p className="text-[11px] font-mono text-muted-foreground">A/C: {(customer as any).account_number}</p>
                  )}
                  {(customer as any).ifsc_code && (
                    <p className="text-[10px] font-mono uppercase text-muted-foreground">IFSC: {(customer as any).ifsc_code}</p>
                  )}
                </div>
              )}
            </div>

            {/* ── PASSBOOK MODE 1: SIMPLE SUMMARY VIEW ────────────────────── */}
            {passbookMode === 'simple' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5 text-amber-500" /> Scheme Savings Summary Overview
                  </h3>
                  <span className="text-xs text-muted-foreground font-semibold">
                    {chits.length} Enrolled {chits.length === 1 ? 'Scheme' : 'Schemes'}
                  </span>
                </div>

                {chits.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    No active or completed chit schemes found for this member.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border border-border rounded-xl overflow-hidden">
                      <thead className="bg-muted/70 text-muted-foreground uppercase text-[10px] font-bold">
                        <tr>
                          <th className="py-3 px-3">Scheme Name</th>
                          <th className="py-3 px-3 text-right">Monthly Due</th>
                          <th className="py-3 px-3 text-center">Installments Paid</th>
                          <th className="py-3 px-3 text-right">Total Paid (₹)</th>
                          <th className="py-3 px-3 text-right">Target Maturity (₹)</th>
                          <th className="py-3 px-3 text-center">Maturity Date</th>
                          <th className="py-3 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {chits.map((chit) => {
                          const chitPayments = payments.filter(p => p.customer_chit_id === chit.id)
                          const chitTotalPaid = chitPayments.reduce((s, p) => s + (p.amount || 0), 0)
                          const duration = chit.scheme?.duration_months || 11
                          const monthlyAgreed = chit.agreed_amount || chit.scheme?.min_installment || 0
                          const targetAmount = monthlyAgreed * duration

                          return (
                            <tr key={chit.id} className="hover:bg-muted/30">
                              <td className="py-3 px-3 font-bold text-foreground">
                                {chit.scheme?.name || 'Gold Chit Plan'}
                              </td>
                              <td className="py-3 px-3 text-right font-semibold text-foreground">
                                {formatINR(monthlyAgreed)}
                              </td>
                              <td className="py-3 px-3 text-center font-semibold text-amber-600 dark:text-amber-400">
                                {chitPayments.length} of {duration} ({Math.min(100, Math.round((chitPayments.length / duration) * 100))}%)
                              </td>
                              <td className="py-3 px-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                                {formatINR(chitTotalPaid)}
                              </td>
                              <td className="py-3 px-3 text-right font-bold text-foreground">
                                {formatINR(targetAmount)}
                              </td>
                              <td className="py-3 px-3 text-center font-medium text-foreground">
                                {formatDate(chit.maturity_date)}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[9px] uppercase font-bold">
                                  {chit.status}
                                </Badge>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-amber-500/10 border-t-2 border-amber-500/40 font-extrabold text-xs">
                          <td colSpan={3} className="py-3 px-3 text-foreground uppercase tracking-wider">
                            Grand Total Summary Across All Schemes:
                          </td>
                          <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400 text-sm">
                            {formatINR(totalPaid)}
                          </td>
                          <td className="py-3 px-3 text-right text-foreground text-sm">
                            {formatINR(totalTargetValue)}
                          </td>
                          <td colSpan={2} className="py-3 px-3 text-center text-muted-foreground font-normal">
                            {totalTargetValue > 0 ? `${Math.min(100, Math.round((totalPaid / totalTargetValue) * 100))}% Completed` : ''}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── PASSBOOK MODE 2: DETAILED SCHEME-WISE LEDGERS ─────────────── */}
            {passbookMode === 'detailed' && (
              <div className="space-y-8">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="font-heading font-bold text-base text-foreground flex items-center gap-2">
                    <ListOrdered className="h-5 w-5 text-amber-500" /> Scheme-wise Installment Ledgers
                  </h3>
                  <span className="text-xs text-muted-foreground font-semibold">
                    {chits.length} Enrolled {chits.length === 1 ? 'Scheme' : 'Schemes'}
                  </span>
                </div>

                {chits.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    No active or completed chit schemes found for this member.
                  </div>
                ) : (
                  chits.map((chit, idx) => {
                    const chitPayments = payments.filter(p => p.customer_chit_id === chit.id)
                    const duration = chit.scheme?.duration_months || 11
                    const monthlyAgreed = chit.agreed_amount || chit.scheme?.min_installment || 0
                    const targetMaturity = monthlyAgreed * duration

                    let runningSubtotal = 0

                    return (
                      <div key={chit.id} className="space-y-3 p-5 rounded-xl border border-amber-500/30 bg-card/60 shadow-sm page-break-inside-avoid">
                        {/* Scheme Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-heading font-bold text-base text-foreground">
                                {idx + 1}. {chit.scheme?.name || 'Gold Chit Plan'}
                              </h4>
                              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] uppercase font-bold">
                                {chit.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {duration} Months Plan • Due Day: {chit.monthly_due_day} • Start: {formatDate(chit.start_date)} • Maturity: {formatDate(chit.maturity_date)}
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-[10px] text-muted-foreground font-semibold uppercase">Monthly Agreed Due</p>
                            <p className="font-bold text-amber-600 dark:text-amber-400 text-sm">{formatINR(monthlyAgreed)}</p>
                          </div>
                        </div>

                        {/* Scheme Ledger Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left border-collapse">
                            <thead>
                              <tr className="bg-muted/70 border-y border-border text-[10px] uppercase text-muted-foreground font-bold">
                                <th className="py-2 px-3">Ins #</th>
                                <th className="py-2 px-3">Date</th>
                                <th className="py-2 px-3">Payment Mode</th>
                                <th className="py-2 px-3">Collected By</th>
                                <th className="py-2 px-3">Receipt / Notes</th>
                                <th className="py-2 px-3 text-right">Amount (₹)</th>
                                <th className="py-2 px-3 text-right">Running Subtotal (₹)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                              {chitPayments.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="py-4 text-center text-muted-foreground italic">
                                    No installments recorded yet for this scheme.
                                  </td>
                                </tr>
                              ) : (
                                chitPayments.map((p, pIdx) => {
                                  runningSubtotal += (p.amount || 0)
                                  return (
                                    <tr key={p.id} className="hover:bg-muted/30">
                                      <td className="py-2 px-3 font-semibold text-muted-foreground">
                                        #{pIdx + 1}
                                      </td>
                                      <td className="py-2 px-3 font-medium text-foreground">
                                        {formatDate(p.payment_date)}
                                      </td>
                                      <td className="py-2 px-3 uppercase text-[10px] font-bold text-muted-foreground">
                                        {p.payment_mode}
                                      </td>
                                      <td className="py-2 px-3">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold text-[10px]">
                                          {p.recorder?.full_name || 'Admin'}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-muted-foreground">
                                        {p.notes || 'Monthly Installment'}
                                      </td>
                                      <td className="py-2 px-3 text-right font-semibold text-foreground">
                                        {formatINR(p.amount)}
                                      </td>
                                      <td className="py-2 px-3 text-right font-extrabold text-amber-600 dark:text-amber-400">
                                        {formatINR(runningSubtotal)}
                                      </td>
                                    </tr>
                                  )
                                })
                              )}
                            </tbody>
                            {chitPayments.length > 0 && (
                              <tfoot>
                                <tr className="bg-amber-500/10 border-t-2 border-amber-500/30 font-bold text-xs">
                                  <td colSpan={4} className="py-2.5 px-3 text-foreground">
                                    Scheme Subtotal ({chitPayments.length} of {duration} installments paid):
                                  </td>
                                  <td className="py-2.5 px-3 text-right text-foreground">
                                    {formatINR(runningSubtotal)}
                                  </td>
                                  <td className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400">
                                    {formatINR(runningSubtotal)} / {formatINR(targetMaturity)}
                                  </td>
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {/* GRAND TOTAL SUMMARY BLOCK */}
            <div className="p-5 rounded-xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border-2 border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">Grand Total Passbook Balance</p>
                <p className="text-xs text-muted-foreground">Total accumulated gold scheme deposits</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">{formatINR(totalPaid)}</p>
                <p className="text-[11px] text-muted-foreground">Across {chits.length} enrolled scheme plans</p>
              </div>
            </div>

            {/* Store Seal & Signature Footer */}
            <div className="pt-8 border-t border-border flex justify-between items-end text-xs text-muted-foreground">
              <div>
                <p className="font-semibold text-foreground">Customer Signature</p>
                <div className="h-12 w-36 border-b border-dashed border-border/80 mt-2" />
              </div>
              <div className="text-center">
                <div className="h-12 w-24 mx-auto border border-amber-500/30 rounded-full flex items-center justify-center text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  DIGIGOLD SEAL
                </div>
                <p className="text-[10px] mt-1">Verified Passbook</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">Authorized Signatory</p>
                <div className="h-12 w-36 border-b border-dashed border-border/80 mt-2" />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 2: Enrolled Schemes with Card Hover Effects ──────────────── */}
        <TabsContent value="schemes" className="space-y-4">
          {loadingChits ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map(i => <Skeleton key={i} className="h-56 rounded-2xl" />)}
            </div>
          ) : chits.length === 0 ? (
            <Card className="p-12 text-center space-y-3">
              <Layers className="h-10 w-10 text-muted-foreground/50 mx-auto" />
              <h3 className="font-semibold text-lg">No Chit Schemes Enrolled</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                This customer is not currently enrolled in any gold chit schemes.
              </p>
              <Button
                variant="outline"
                onClick={() => setOpenEnroll(true)}
                className="mt-2 gap-2 text-amber-600 dark:text-amber-400 border-amber-500/40"
              >
                <Plus className="h-4 w-4" /> Enroll in Scheme Now
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {chits.map((chit, idx) => {
                const chitPayments = payments.filter(p => p.customer_chit_id === chit.id)
                const chitTotalPaid = chitPayments.reduce((s, p) => s + (p.amount || 0), 0)
                const duration = chit.scheme?.duration_months || 11
                const monthlyAgreed = chit.agreed_amount || chit.scheme?.min_installment || 0
                const targetAmount = monthlyAgreed * duration
                const paidCount = chitPayments.length
                const progressPct = Math.min(100, Math.round((paidCount / duration) * 100))

                return (
                  <motion.div
                    key={chit.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    whileHover={{ y: -4 }}
                  >
                    <Card className="p-6 space-y-5 border-amber-500/25 relative hover:border-amber-500/60 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-amber-500/10">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-heading text-lg font-bold text-foreground">
                              {chit.scheme?.name || 'Gold Chit Plan'}
                            </h3>
                            <Badge className={`text-[10px] uppercase font-bold px-2 py-0.5 ${
                              chit.status === 'active'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                            }`}>
                              {chit.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {duration} Months Plan • Due on Day {chit.monthly_due_day} of each month
                          </p>
                          {chit.enroller && (
                            <div className="flex items-center gap-1.5 mt-2">
                              <span className="text-[10px] text-muted-foreground font-semibold">Enrolled By:</span>
                              <Badge variant="outline" className="text-[9px] uppercase font-bold px-1.5 py-0 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 h-5">
                                <UserCheck2 className="h-3 w-3" />
                                {chit.enroller.full_name}
                              </Badge>
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10 shrink-0 shadow-sm"
                          onClick={() => {
                            setSelectedChitId(chit.id)
                            setPayAmount(monthlyAgreed.toString())
                            setOpenPayment(true)
                          }}
                        >
                          <IndianRupee className="h-3.5 w-3.5" /> Pay Due
                        </Button>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-muted-foreground">Installment Progress</span>
                          <span className="text-amber-600 dark:text-amber-400">
                            {paidCount} of {duration} Paid ({progressPct}%)
                          </span>
                        </div>
                        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border/50">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPct}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full shadow-inner"
                          />
                        </div>
                      </div>

                      {/* Financial Grid */}
                      <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-muted/40 text-xs border border-border/60">
                        <div>
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase">Monthly</p>
                          <p className="font-bold text-foreground text-sm mt-0.5">{formatINR(monthlyAgreed)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase">Paid So Far</p>
                          <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">{formatINR(chitTotalPaid)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase">Target Value</p>
                          <p className="font-bold text-foreground text-sm mt-0.5">{formatINR(targetAmount)}</p>
                        </div>
                      </div>

                      {/* Timeline Details */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-amber-500" /> Start: {formatDate(chit.start_date)}
                        </span>
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Calendar className="h-3.5 w-3.5 text-amber-500" /> Matures: {formatDate(chit.maturity_date)}
                        </span>
                      </div>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TAB 3: Payment History ─────────────────────────────────────── */}
        <TabsContent value="payments" className="space-y-4">
          <Card className="p-4 md:p-6 shadow-md hover:shadow-lg transition-shadow">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-5">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search receipt / notes / mode…"
                  value={paymentSearch}
                  onChange={e => setPaymentSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs w-full sm:w-auto"
                disabled={payments.length === 0}
                onClick={() => exportCSV(`customer_${customer.name}_payments.csv`, payments.map(p => ({
                  Date: p.payment_date,
                  Amount: p.amount,
                  Mode: p.payment_mode,
                  Notes: p.notes || '',
                })))}
              >
                <Download className="h-3.5 w-3.5" /> Export Payments CSV
              </Button>
            </div>

            {loadingPayments ? (
              <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No payment transactions found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/60 border-b border-border text-muted-foreground uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Scheme</th>
                      <th className="py-3 px-4">Mode</th>
                      <th className="py-3 px-4">Notes / Ref</th>
                      <th className="py-3 px-4 text-right">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-medium text-foreground">
                          {formatDate(p.payment_date)}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {p.customer_chit?.scheme?.name || 'Chit Plan'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="uppercase text-[9px] font-bold tracking-wider">
                            {p.payment_mode}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {p.notes || 'Monthly installment'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-amber-600 dark:text-amber-400 text-sm">
                          {formatINR(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ── TAB 4: Full Profile & Address Details ──────────────────────── */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Details */}
            <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
              <Card className="p-6 space-y-4 shadow-md hover:shadow-xl transition-all border-amber-500/20 hover:border-amber-500/40">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="font-heading font-bold text-base flex items-center gap-2">
                    <User className="h-4 w-4 text-amber-500" /> Personal Details
                  </h3>
                  <Button size="sm" variant="ghost" onClick={() => setOpenEdit(true)} className="h-8 gap-1 text-xs">
                    <Edit className="h-3 w-3" /> Edit
                  </Button>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">First Name</span>
                    <span className="font-semibold text-foreground">{customer.first_name || customer.name.split(' ')[0]}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Last Name</span>
                    <span className="font-semibold text-foreground">{customer.last_name || customer.name.split(' ').slice(1).join(' ') || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Primary Mobile Phone</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{customer.phone}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Customer System ID</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{customer.id}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Registration Date</span>
                    <span className="font-medium text-foreground">{formatDateTime(customer.created_at)}</span>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Address Details */}
            <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
              <Card className="p-6 space-y-4 shadow-md hover:shadow-xl transition-all border-amber-500/20 hover:border-amber-500/40">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="font-heading font-bold text-base flex items-center gap-2">
                    <Home className="h-4 w-4 text-amber-500" /> Address & Location
                  </h3>
                  <Button size="sm" variant="ghost" onClick={() => setOpenEdit(true)} className="h-8 gap-1 text-xs">
                    <Edit className="h-3 w-3" /> Edit
                  </Button>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Door / House No.</span>
                    <span className="font-semibold text-foreground">{customer.door_no || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Street Name</span>
                    <span className="font-semibold text-foreground">{customer.street || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Area / Landmark</span>
                    <span className="font-semibold text-foreground">{customer.area || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">City</span>
                    <span className="font-semibold text-foreground">{customer.city || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Pincode</span>
                    <span className="font-semibold text-foreground">{customer.pincode || '—'}</span>
                  </div>
                  <div className="pt-2">
                    <p className="text-muted-foreground text-[11px] mb-1 font-semibold">Formatted Full Address:</p>
                    <p className="p-2.5 rounded-lg bg-muted/50 border border-border text-foreground font-medium">
                      {formattedAddress}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── REDESIGNED PREMIUM MODAL: RECORD INSTALLMENT PAYMENT ───────────── */}
      <Dialog open={openPayment} onOpenChange={setOpenPayment}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden border-2 border-amber-500/40 shadow-2xl">
          {/* Modal Header Banner */}
          <DialogHeader className="p-6 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border-b border-amber-500/25">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-white flex items-center justify-center shadow-lg">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-extrabold text-foreground">
                    Record Installment Payment
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Post payment deposit into DigiGold customer passbook ledger
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Summary Chip */}
            <div className="mt-4 flex items-center justify-between p-2.5 rounded-xl bg-card border border-amber-500/30 text-xs shadow-sm">
              <div className="flex items-center gap-2.5">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={customer.photo_url ?? undefined} />
                  <AvatarFallback className="bg-amber-500/20 text-amber-600 font-bold text-xs">
                    {getInitials(customer.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-foreground">{customer.name}</p>
                  <p className="text-[10px] text-muted-foreground">{customer.phone}</p>
                </div>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                Verified Member
              </Badge>
            </div>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              recordPaymentMutation.mutate()
            }}
            className="p-6 space-y-5"
          >
            {/* 1. Chit Scheme Selection Dropdown */}
            <div className="space-y-1.5">
              <Label htmlFor="schemeSelect" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-amber-500" /> Select Enrolled Scheme Plan
              </Label>

              {chits.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center space-y-2">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    No enrolled scheme plans found for {customer.name}.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setOpenPayment(false)
                      setOpenEnroll(true)
                    }}
                    className="text-xs gap-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                  >
                    <Plus className="h-3.5 w-3.5" /> Enroll Customer in Scheme First
                  </Button>
                </div>
              ) : (
                <Select
                  value={selectedChitId}
                  onValueChange={(val) => {
                    setSelectedChitId(val)
                    const targetChit = chits.find(c => c.id === val)
                    if (targetChit) {
                      setPayAmount((targetChit.agreed_amount || targetChit.scheme?.min_installment || 0).toString())
                    }
                  }}
                >
                  <SelectTrigger id="schemeSelect" className="h-10 text-sm border-amber-500/40 focus:ring-amber-500">
                    <SelectValue placeholder="Choose scheme plan..." />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-[9999]">
                    {chits.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.scheme?.name ?? 'Gold Chit Plan'} — Monthly Due: {formatINR(c.agreed_amount || c.scheme?.min_installment)} (Day {c.monthly_due_day})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Selected Chit Live Summary Box */}
            {selectedChit && chits.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/25 grid grid-cols-3 gap-2 text-xs"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Monthly Due</p>
                  <p className="font-extrabold text-amber-600 dark:text-amber-400 text-sm mt-0.5">
                    {formatINR(selectedMonthlyDue)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Paid So Far</p>
                  <p className="font-bold text-foreground text-sm mt-0.5">
                    {formatINR(selectedChitPaid)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Installments</p>
                  <p className="font-bold text-foreground text-sm mt-0.5">
                    {selectedChitPayments.length} / {selectedDuration}
                  </p>
                </div>
              </motion.div>
            )}

            {/* 2. Fixed Read-Only Payment Amount (Based on Customer Enrolled Scheme) */}
            {chits.length > 0 && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <IndianRupee className="h-3.5 w-3.5 text-amber-500" /> Agreed Monthly Installment Amount
                  </Label>
                  <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between shadow-sm">
                    <div>
                      <p className="text-[10px] uppercase font-extrabold text-muted-foreground">Fixed Scheme Installment</p>
                      <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                        {formatINR(selectedMonthlyDue)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold border-amber-500/40 text-amber-700 dark:text-amber-400 bg-card gap-1 py-1 px-2.5">
                      <Lock className="h-3 w-3 text-amber-500" /> Fixed Scheme Rate
                    </Badge>
                  </div>
                </div>

                {/* 3. Payment Mode Dropdown */}
                <div className="space-y-1.5">
                  <Label htmlFor="modeSelect" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-amber-500" /> Payment Mode
                  </Label>
                  <Select value={paymentMode} onValueChange={(val: any) => setPaymentMode(val)}>
                    <SelectTrigger id="modeSelect" className="h-10 text-sm border-amber-500/40 focus:ring-amber-500">
                      <SelectValue placeholder="Select payment mode..." />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[9999]">
                      <SelectItem value="upi">📱 UPI / GPay / PhonePe</SelectItem>
                      <SelectItem value="cash">💵 Cash Payment</SelectItem>
                      <SelectItem value="bank_transfer">🏛️ Bank Transfer (IMPS / NEFT)</SelectItem>
                      <SelectItem value="cheque">📜 Cheque Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 4. Payment Date & Reference Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="payDate" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-amber-500" /> Payment Date
                    </Label>
                    <Input
                      id="payDate"
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      required
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="payNotes" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-amber-500" /> Receipt Notes / Ref
                    </Label>
                    <Input
                      id="payNotes"
                      placeholder="Optional receipt / UPI ref..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

              </>
            )}

            {/* Footer Buttons */}
            <DialogFooter className="pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpenPayment(false)}>
                Cancel
              </Button>
              {chits.length > 0 && (
                <GoldButton
                  type="submit"
                  size="sm"
                  disabled={recordPaymentMutation.isPending || !selectedChitId}
                  className="gap-2 shadow-lg shadow-amber-500/20"
                >
                  {recordPaymentMutation.isPending ? (
                    <><span className="animate-spin">⟳</span> Recording Deposit...</>
                  ) : (
                    <><CheckCircle2 className="h-4 w-4" /> Confirm & Post Payment</>
                  )}
                </GoldButton>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: REDESIGNED PREMIUM ENROLL IN NEW SCHEME ──────────────── */}
      <Dialog open={openEnroll} onOpenChange={setOpenEnroll}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden border-2 border-amber-500/40 shadow-2xl">
          {/* Modal Header Banner */}
          <DialogHeader className="p-6 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border-b border-amber-500/25">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-white flex items-center justify-center shadow-lg">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-extrabold text-foreground">
                    Enroll in New Scheme Plan
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Start a new gold chit savings account for this customer
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Summary Chip */}
            <div className="mt-4 flex items-center justify-between p-2.5 rounded-xl bg-card border border-amber-500/30 text-xs shadow-sm">
              <div className="flex items-center gap-2.5">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={customer.photo_url ?? undefined} />
                  <AvatarFallback className="bg-amber-500/20 text-amber-600 font-bold text-xs">
                    {getInitials(customer.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-foreground">{customer.name}</p>
                  <p className="text-[10px] text-muted-foreground">{customer.phone}</p>
                </div>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                Active Member
              </Badge>
            </div>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              enrollSchemeMutation.mutate()
            }}
            className="p-6 space-y-5"
          >
            {/* 1. Select Scheme Plan Dropdown */}
            <div className="space-y-1.5">
              <Label htmlFor="enrollSchemeSelect" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-amber-500" /> Select Jewelry Scheme Plan
              </Label>
              <Select
                value={schemeId}
                onValueChange={(val) => {
                  setSchemeId(val)
                  const targetScheme = schemes.find(s => s.id === val)
                  if (targetScheme) {
                    setAgreedAmount(targetScheme.min_installment.toString())
                  }
                }}
              >
                <SelectTrigger id="enrollSchemeSelect" className="h-10 text-sm border-amber-500/40 focus:ring-amber-500">
                  <SelectValue placeholder="Choose jewelry scheme plan..." />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[9999]">
                  {schemes.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.duration_months} Months — Min {formatINR(s.min_installment)}/mo)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Scheme Offer Highlights Card */}
            {(() => {
              if (!schemeId) return null
              const activeScheme = schemes.find(s => s.id === schemeId)
              if (!activeScheme) return null
              const monthly = parseFloat(agreedAmount) || activeScheme.min_installment
              const targetVal = monthly * activeScheme.duration_months

              return (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/10 via-card to-background border border-amber-500/30 space-y-2.5 text-xs shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                    <span className="font-extrabold text-foreground text-xs">{activeScheme.name}</span>
                    <Badge className="bg-amber-500 text-white text-[10px] font-bold">
                      {activeScheme.duration_months} Months Plan
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>Bonus: <strong className="text-emerald-600 dark:text-emerald-400">{activeScheme.bonus_months > 0 ? `${activeScheme.bonus_months} Month Free` : 'Standard'}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Coins className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>Target: <strong className="text-amber-600 dark:text-amber-400">{formatINR(targetVal)}</strong></span>
                    </div>
                  </div>

                  {activeScheme.gift_description && (
                    <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <Gift className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>{activeScheme.gift_description}</span>
                    </div>
                  )}
                </motion.div>
              )
            })()}

            {/* 2. Monthly Agreed Amount with Presets & Minimum Scheme Limit */}
            {(() => {
              const activeSchemeObj = schemes.find(s => s.id === schemeId)
              const minLimit = activeSchemeObj?.min_installment || 1000
              const isBelowMin = parseFloat(agreedAmount) > 0 && parseFloat(agreedAmount) < minLimit
              const validPresets = [1000, 2500, 5000, 10000, 25000].filter(a => a >= minLimit)

              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="agreedAmount" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <IndianRupee className="h-3.5 w-3.5 text-amber-500" /> Agreed Monthly Installment (₹)
                    </Label>
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      Min: {formatINR(minLimit)}/mo
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-lg font-extrabold text-amber-500">₹</span>
                    <Input
                      id="agreedAmount"
                      type="number"
                      min={minLimit}
                      step="100"
                      placeholder={`Min ${minLimit}`}
                      value={agreedAmount}
                      onChange={(e) => setAgreedAmount(e.target.value)}
                      required
                      className={`pl-9 h-11 text-lg font-bold border-amber-500/40 focus:border-amber-500 ${
                        isBelowMin ? 'border-destructive ring-1 ring-destructive' : ''
                      }`}
                    />
                  </div>

                  {isBelowMin && (
                    <p className="text-[11px] font-bold text-destructive flex items-center gap-1">
                      ⚠️ Monthly deposit must be at least {formatINR(minLimit)} for this scheme.
                    </p>
                  )}

                  {/* Quick Presets (Filtered >= minLimit) */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {validPresets.map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAgreedAmount(amt.toString())}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all ${
                          agreedAmount === amt.toString()
                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                            : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:border-amber-500/40'
                        }`}
                      >
                        ₹{amt >= 1000 ? `${amt/1000}k` : amt}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* 3. Monthly Due Day of Month with Quick Chips */}
            <div className="space-y-2">
              <Label htmlFor="dueDay" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-amber-500" /> Monthly Collection Due Day
              </Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex gap-1.5">
                  {['5', '10', '15', '20', '25'].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDueDay(d)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                        dueDay === d
                          ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                          : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {d}th
                    </button>
                  ))}
                </div>
                <Input
                  id="dueDay"
                  type="number"
                  min={1}
                  max={28}
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  required
                  className="w-16 h-9 text-xs font-bold text-center border-amber-500/40"
                />
              </div>
            </div>

            {/* Summary Preview Banner before submit */}
            {schemeId && parseFloat(agreedAmount) > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs"
              >
                <span className="font-medium text-foreground">
                  Enrolling for <strong className="text-amber-600 dark:text-amber-400">{formatINR(parseFloat(agreedAmount))}/mo</strong> (Due on Day {dueDay})
                </span>
                <Badge className="bg-amber-500 text-white text-[10px]">Ready</Badge>
              </motion.div>
            )}

            {/* Footer Buttons */}
            <DialogFooter className="pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpenEnroll(false)}>
                Cancel
              </Button>
              <GoldButton
                type="submit"
                size="sm"
                disabled={enrollSchemeMutation.isPending || !schemeId || !agreedAmount}
                className="gap-2 shadow-lg shadow-amber-500/20"
              >
                {enrollSchemeMutation.isPending ? (
                  <><span className="animate-spin">⟳</span> Enrolling Member...</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" /> Confirm & Enroll Customer</>
                )}
              </GoldButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 3: Edit Customer Profile (Multi-Step Wizard) ──────────── */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="w-[96vw] max-w-2xl p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-0">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                <Edit className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
              </div>
              Edit Customer Profile
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">
              Update customer details step-by-step
            </p>
          </DialogHeader>

          <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-6 overflow-y-auto max-h-[calc(92vh-120px)]">
            {/* Step Bar */}
            <div className="flex items-center gap-0 mb-6">
              {[
                { id: 1, label: 'Personal', icon: User },
                { id: 2, label: 'Address',  icon: Home },
                { id: 3, label: 'ID Proof', icon: CreditCard },
                { id: 4, label: 'Review',   icon: CheckCircle2 },
              ].map((s, idx, arr) => {
                const Icon = s.icon
                const done   = editStep > s.id
                const active = editStep === s.id
                return (
                  <React.Fragment key={s.id}>
                    <button
                      type="button"
                      onClick={() => setEditStep(s.id)}
                      className="flex flex-col items-center gap-1 flex-1 group focus:outline-none cursor-pointer"
                    >
                      <div
                        className={`h-9 w-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                          done
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : active
                            ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/30'
                            : 'bg-muted border-border text-muted-foreground group-hover:border-amber-500/40'
                        }`}
                      >
                        {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </div>
                      <span className={`text-[10px] font-semibold ${active ? 'text-amber-600 dark:text-amber-400 font-bold' : done ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {s.label}
                      </span>
                    </button>
                    {idx < arr.length - 1 && (
                      <div className={`h-0.5 flex-1 mb-4 transition-all duration-500 ${done ? 'bg-amber-500' : 'bg-border'}`} />
                    )}
                  </React.Fragment>
                )
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={editStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* ── Step 1: Personal Info ── */}
                {editStep === 1 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="h-4 w-4 text-amber-500" />
                      <h3 className="text-sm font-bold text-foreground">Personal Information</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="editFirstName" className="text-xs font-semibold text-foreground/80">
                          First Name <span className="text-amber-500">*</span>
                        </Label>
                        <Input
                          id="editFirstName"
                          value={editFirstName}
                          onChange={(e) => setEditFirstName(e.target.value)}
                          placeholder="First Name"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="editLastName" className="text-xs font-semibold text-foreground/80">
                          Last Name
                        </Label>
                        <Input
                          id="editLastName"
                          value={editLastName}
                          onChange={(e) => setEditLastName(e.target.value)}
                          placeholder="Last Name"
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="editPhone" className="text-xs font-semibold text-foreground/80">
                          Mobile Phone <span className="text-amber-500">*</span>
                        </Label>
                        <Input
                          id="editPhone"
                          type="tel"
                          maxLength={10}
                          value={editPhone}
                          onChange={(e) => {
                            setEditPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))
                            setEditPhoneError('')
                          }}
                          placeholder="9876543210"
                          className={`h-9 text-sm ${editPhoneError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                        />
                        {editPhoneError ? (
                          <p className="text-[11px] text-red-500 font-semibold">{editPhoneError}</p>
                        ) : editPhone.length > 0 && editPhone.length < 10 ? (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Enter 10 numeric digits ({editPhone.length}/10)</p>
                        ) : editPhone.length === 10 ? (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Valid 10-digit number
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="editAltPhone" className="text-xs font-semibold text-foreground/80">
                          Alternate Phone
                        </Label>
                        <Input
                          id="editAltPhone"
                          type="tel"
                          maxLength={10}
                          value={editAltPhone}
                          onChange={(e) => setEditAltPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                          placeholder="Alternate Phone"
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="editDob" className="text-xs font-semibold text-foreground/80 flex items-center justify-between">
                          <span>Date of Birth</span>
                          <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
                        </Label>
                        <Input
                          id="editDob"
                          type="date"
                          value={editDob}
                          onChange={(e) => setEditDob(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="editAnniversaryDate" className="text-xs font-semibold text-foreground/80 flex items-center justify-between">
                          <span>Wedding Anniversary</span>
                          <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
                        </Label>
                        <Input
                          id="editAnniversaryDate"
                          type="date"
                          value={editAnniversaryDate}
                          onChange={(e) => setEditAnniversaryDate(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>

                    {editFirstName && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
                        <Avatar className="h-10 w-10 border border-amber-500/30">
                          <AvatarFallback className="bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-sm">
                            {getInitials([editFirstName, editLastName].filter(Boolean).join(' '))}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {[editFirstName, editLastName].filter(Boolean).join(' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">{editPhone}</p>
                        </div>
                        <Badge className="ml-auto bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px]">
                          Profile Edit
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Step 2: Address Details ── */}
                {editStep === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Home className="h-4 w-4 text-amber-500" />
                      <h3 className="text-sm font-bold text-foreground">Address Details</h3>
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">(Mandatory)</span>
                    </div>

                    {/* Door / House No & Flat Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="editDoorNo" className="text-xs font-semibold text-foreground/80">
                          Door / House No. <span className="text-amber-500">*</span>
                        </Label>
                        <Input id="editDoorNo" value={editDoorNo} onChange={(e) => setEditDoorNo(e.target.value)} placeholder="12B" className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="editFlatName" className="text-xs font-semibold text-foreground/80">Flat / Apartment Name</Label>
                        <Input id="editFlatName" value={editFlatName} onChange={(e) => setEditFlatName(e.target.value)} placeholder="Royal Palms" className="h-9 text-sm" />
                      </div>
                    </div>

                    {/* Street / Road */}
                    <div className="space-y-1.5">
                      <Label htmlFor="editStreet" className="text-xs font-semibold text-foreground/80">
                        Street / Road <span className="text-amber-500">*</span>
                      </Label>
                      <Input id="editStreet" value={editStreet} onChange={(e) => setEditStreet(e.target.value)} placeholder="Anna Salai Main Road" className="h-9 text-sm" />
                    </div>

                    {/* Landmark & Area */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="editLandmark" className="text-xs font-semibold text-foreground/80">Landmark</Label>
                        <Input id="editLandmark" value={editLandmark} onChange={(e) => setEditLandmark(e.target.value)} placeholder="Near Bus Stand" className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="editArea" className="text-xs font-semibold text-foreground/80">Area</Label>
                        <Input id="editArea" value={editArea} onChange={(e) => setEditArea(e.target.value)} placeholder="T. Nagar" className="h-9 text-sm" />
                      </div>
                    </div>

                    {/* City, State, & PinCode */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="editCity" className="text-xs font-semibold text-foreground/80">
                          City <span className="text-amber-500">*</span>
                        </Label>
                        <Input id="editCity" value={editCity} onChange={(e) => setEditCity(e.target.value)} placeholder="Chennai" className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="editState" className="text-xs font-semibold text-foreground/80">State</Label>
                        <Input id="editState" value={editState} onChange={(e) => setEditState(e.target.value)} placeholder="Tamil Nadu" className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="editPincode" className="text-xs font-semibold text-foreground/80">
                          PinCode <span className="text-amber-500">*</span>
                        </Label>
                        <Input
                          id="editPincode"
                          type="tel"
                          maxLength={6}
                          value={editPincode}
                          onChange={(e) => handleEditPincodeChange(e.target.value)}
                          placeholder="600001"
                          className="h-9 text-sm"
                        />
                        {editPincode.length > 0 && editPincode.length < 6 ? (
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Enter 6 numeric digits ({editPincode.length}/6)</p>
                        ) : editPincode.length === 6 ? (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Valid 6-digit PinCode
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {(editDoorNo || editFlatName || editStreet || editLandmark || editArea || editCity || editState || editPincode) && (
                      <div className="p-3 rounded-xl bg-muted/50 border border-border text-xs text-muted-foreground">
                        <p className="font-semibold text-foreground text-[11px] mb-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-amber-500" /> Address Preview
                        </p>
                        {[editDoorNo, editFlatName, editStreet, editLandmark, editArea, editCity, editState, editPincode].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Step 3: Identity Verification ── */}
                {editStep === 3 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Fingerprint className="h-4 w-4 text-amber-500" />
                      <h3 className="text-sm font-bold text-foreground">Identity Verification</h3>
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">(Mandatory)</span>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-foreground/80">
                        ID Proof Type <span className="text-amber-500">*</span>
                      </Label>
                      <Select value={editIdType} onValueChange={(val) => { setEditIdType(val); setEditIdNumber(''); }}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select ID proof type..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aadhaar">Aadhaar Card (12 digits)</SelectItem>
                          <SelectItem value="pan">PAN Card (10 alphanumeric)</SelectItem>
                          <SelectItem value="voter">Voter ID</SelectItem>
                          <SelectItem value="passport">Passport</SelectItem>
                          <SelectItem value="driving">Driving Licence</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="editIdNumber" className="text-xs font-semibold text-foreground/80">
                        ID Number <span className="text-amber-500">*</span>
                      </Label>
                      <Input
                        id="editIdNumber"
                        value={editIdNumber}
                        onChange={(e) => handleEditIdNumberChange(e.target.value)}
                        placeholder={editIdType === 'aadhaar' ? '12-digit number (e.g. 987654321012)' : editIdType === 'pan' ? '10-char PAN (e.g. ABCDE1234F)' : 'Enter ID number'}
                        className="h-9 text-sm uppercase"
                      />
                      {editIdType === 'aadhaar' && editIdNumber.length > 0 && editIdNumber.length < 12 ? (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Enter 12 numeric digits ({editIdNumber.length}/12)</p>
                      ) : editIdType === 'aadhaar' && editIdNumber.length === 12 ? (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Valid 12-digit Aadhaar
                        </p>
                      ) : editIdType === 'pan' && editIdNumber.length > 0 && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(editIdNumber) ? (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Format: 5 letters + 4 digits + 1 letter ({editIdNumber.length}/10)</p>
                      ) : editIdType === 'pan' && /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(editIdNumber) ? (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Valid PAN Number
                        </p>
                      ) : null}
                    </div>
                    {editIdType && editIdNumber && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                        <CreditCard className="h-4 w-4 text-emerald-500 shrink-0" />
                        <div>
                          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">ID Verification Noted</p>
                          <p className="text-xs text-muted-foreground">{(editIdType || '').toString().toUpperCase()} · {editIdNumber}</p>
                        </div>
                      </div>
                    )}

                    {/* ── Nominee Details Section (Optional) ── */}
                    <div className="pt-4 border-t border-border space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-amber-500" /> Nominee Details
                        </h4>
                        <span className="text-[10px] text-muted-foreground font-semibold">(Optional)</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="editNomineeName" className="text-xs font-semibold text-foreground/80">Nominee Name</Label>
                          <Input
                            id="editNomineeName"
                            placeholder="e.g. Sunita Kumar"
                            value={editNomineeName}
                            onChange={(e) => setEditNomineeName(e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground/80">Relationship</Label>
                          <Select value={editNomineeRelationship} onValueChange={setEditNomineeRelationship}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select relationship…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Spouse">Spouse</SelectItem>
                              <SelectItem value="Father">Father</SelectItem>
                              <SelectItem value="Mother">Mother</SelectItem>
                              <SelectItem value="Son">Son</SelectItem>
                              <SelectItem value="Daughter">Daughter</SelectItem>
                              <SelectItem value="Brother">Brother</SelectItem>
                              <SelectItem value="Sister">Sister</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="editNomineePhone" className="text-xs font-semibold text-foreground/80">Nominee Phone</Label>
                        <Input
                          id="editNomineePhone"
                          type="tel"
                          maxLength={10}
                          placeholder="9876543210"
                          value={editNomineePhone}
                          onChange={(e) => setEditNomineePhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>

                    {/* ── Bank Details Section (Optional) ── */}
                    <div className="pt-4 border-t border-border space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                          <CreditCard className="h-3.5 w-3.5 text-amber-500" /> Bank Account Details
                        </h4>
                        <span className="text-[10px] text-muted-foreground font-semibold">(Optional)</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="editBankName" className="text-xs font-semibold text-foreground/80">Bank Name</Label>
                          <Input
                            id="editBankName"
                            placeholder="e.g. HDFC Bank, SBI..."
                            value={editBankName}
                            onChange={(e) => setEditBankName(e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="editAccountNumber" className="text-xs font-semibold text-foreground/80">Account Number</Label>
                          <Input
                            id="editAccountNumber"
                            placeholder="Account Number"
                            value={editAccountNumber}
                            onChange={(e) => setEditAccountNumber(e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="editIfscCode" className="text-xs font-semibold text-foreground/80">IFSC Code</Label>
                          <Input
                            id="editIfscCode"
                            placeholder="HDFC0001234"
                            value={editIfscCode}
                            onChange={(e) => setEditIfscCode(e.target.value.toUpperCase())}
                            className="h-9 text-sm uppercase"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="editBankBranch" className="text-xs font-semibold text-foreground/80">Branch Name</Label>
                          <Input
                            id="editBankBranch"
                            placeholder="e.g. T. Nagar Branch"
                            value={editBankBranch}
                            onChange={(e) => setEditBankBranch(e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 4: Review & Confirm ── */}
                {editStep === 4 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="h-4 w-4 text-amber-500" />
                      <h3 className="text-sm font-bold text-foreground">Review Profile Changes</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-border bg-card p-4 space-y-1 text-xs">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                          <User className="h-3 w-3 text-amber-500" /> Personal Info
                        </p>
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <span className="text-muted-foreground">Full Name</span>
                          <span className="font-semibold text-foreground">{[editFirstName, editLastName].filter(Boolean).join(' ')}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-border/50">
                          <span className="text-muted-foreground">Mobile Phone</span>
                          <span className="font-semibold text-foreground">{editPhone}</span>
                        </div>
                        {editAltPhone && (
                          <div className="flex justify-between py-1">
                            <span className="text-muted-foreground">Alt Phone</span>
                            <span className="font-semibold text-foreground">{editAltPhone}</span>
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl border border-border bg-card p-4 space-y-1 text-xs">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                          <Home className="h-3 w-3 text-amber-500" /> Address Details
                        </p>
                        <p className="text-foreground font-medium pt-1">
                          {[editDoorNo, editFlatName, editStreet, editLandmark, editArea, editCity, editState, editPincode].filter(Boolean).join(', ') || 'No address specified'}
                        </p>
                      </div>
                    </div>

                    {editIdType && (
                      <div className="rounded-xl border border-border bg-card p-4 space-y-1 text-xs">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                          <CreditCard className="h-3 w-3 text-amber-500" /> Identity Verification
                        </p>
                        <div className="flex justify-between py-1">
                          <span className="text-muted-foreground">{(editIdType || '').toString().toUpperCase()} Number</span>
                          <span className="font-semibold text-foreground">{editIdNumber || 'Not provided'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Footer Navigation */}
            <div className="flex items-center justify-between pt-5 mt-6 border-t border-border">
              {editStep > 1 ? (
                <Button variant="outline" size="sm" onClick={() => setEditStep((s) => s - 1)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setOpenEdit(false)}>
                  Cancel
                </Button>
              )}

              {editStep < 4 ? (
                <Button
                  size="sm"
                  onClick={() => editStep === 1 ? handleEditNextStep1() : setEditStep((s) => s + 1)}
                  disabled={
                    (editStep === 1 && (!editFirstName.trim() || editPhone.trim().length !== 10 || checkingEditPhone)) ||
                    (editStep === 2 && (!editDoorNo.trim() || !editStreet.trim() || !editCity.trim() || !isEditPincodeValid)) ||
                    (editStep === 3 && !isEditIdValid)
                  }
                  className="bg-amber-500 hover:bg-amber-600 text-white gap-1"
                >
                  {checkingEditPhone ? (
                    <><span className="animate-spin">⟳</span> Checking…</>
                  ) : (
                    <>Next Step <ArrowRight className="h-4 w-4 ml-1" /></>
                  )}
                </Button>
              ) : (
                <GoldButton
                  size="sm"
                  onClick={() => updateCustomerMutation.mutate()}
                  disabled={updateCustomerMutation.isPending}
                  className="gap-2 shadow-lg shadow-amber-500/20"
                >
                  {updateCustomerMutation.isPending ? 'Saving...' : 'Save Profile Changes'}
                </GoldButton>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Printable Payment Receipt Modal ────────────────────────────── */}
      <Dialog open={!!activeReceiptPayment} onOpenChange={(open) => !open && setActiveReceiptPayment(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-card border-amber-500/30">
          <div className="p-6 space-y-6 print:p-0" id="receipt-print-area">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-white font-bold flex items-center justify-center text-lg shadow-md">
                  DG
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-base text-foreground">DigiGold Jewellers</h3>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Official Chit Payment Receipt</p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400 font-mono text-[10px]">
                  Paid
                </Badge>
              </div>
            </div>

            {/* Receipt Metadata */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-muted/40 p-3 rounded-xl border border-border/60">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Receipt No</p>
                <p className="font-mono font-bold text-foreground truncate">#{activeReceiptPayment?.id?.slice(0, 8).toUpperCase()}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Date</p>
                <p className="font-semibold text-foreground">{formatDate(activeReceiptPayment?.payment_date || new Date().toISOString())}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Customer</p>
                <p className="font-bold text-foreground">{customer?.name}</p>
                <p className="text-[11px] text-muted-foreground">{customer?.phone}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Payment Mode</p>
                <p className="font-semibold capitalize text-foreground">{activeReceiptPayment?.payment_mode}</p>
              </div>
            </div>

            {/* Amount Breakdown */}
            <div className="space-y-2 border-t border-b border-border py-4">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Scheme Account</span>
                <span className="font-semibold text-foreground">{activeReceiptPayment?.customer_chit?.scheme?.name || 'Gold Savings Chit'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Monthly Installment</span>
                <span className="font-semibold text-foreground">{formatINR(activeReceiptPayment?.customer_chit?.agreed_amount || activeReceiptPayment?.amount || 0)}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold pt-2 border-t border-border/50">
                <span className="text-foreground">Total Amount Paid</span>
                <span className="text-amber-600 dark:text-amber-400 text-base">{formatINR(activeReceiptPayment?.amount || 0)}</span>
              </div>
            </div>

            {/* Footer Stamp & Print Action */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                <CheckCircle2 className="h-4 w-4" /> Verified Digital Entry
              </div>
              <Button
                onClick={() => window.print()}
                variant="outline"
                size="sm"
                className="gap-2 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
              >
                <Printer className="h-4 w-4" /> Print Receipt
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Admin-Only Delete Customer Confirmation ── */}
      <Dialog open={openDeleteModal} onOpenChange={setOpenDeleteModal}>
        <DialogContent className="sm:max-w-md bg-card border-red-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400 text-lg font-bold">
              <div className="h-9 w-9 rounded-xl bg-red-500/15 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              Delete Customer Record
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs space-y-1.5">
              <p className="font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" /> Irreversible Action (Admin Only)
              </p>
              <p className="text-muted-foreground leading-relaxed">
                You are about to permanently delete <strong>{customer.name}</strong> ({customer.phone}). This will remove all associated scheme enrollments and payment records.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="deleteNote" className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Deletion Reason / Admin Note</span>
                <span className="text-red-500 text-[11px] font-bold">* Mandatory</span>
              </Label>
              <Input
                id="deleteNote"
                value={deleteNote}
                onChange={(e) => setDeleteNote(e.target.value)}
                placeholder="e.g. Account closed on customer request, duplicate registration..."
                className="h-10 text-sm border-red-500/30 focus-visible:ring-red-500"
                required
              />
              <p className="text-[10px] text-muted-foreground">
                An audit reason is strictly required before deletion can be processed.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpenDeleteModal(false)}
              disabled={deleteCustomerMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => deleteCustomerMutation.mutate()}
              disabled={!deleteNote.trim() || deleteCustomerMutation.isPending}
              className="gap-2 font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/20"
            >
              {deleteCustomerMutation.isPending ? (
                <><span className="animate-spin">⟳</span> Deleting Customer…</>
              ) : (
                <><Trash2 className="h-4 w-4" /> Permanently Delete</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
