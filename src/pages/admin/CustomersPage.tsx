import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Customer } from '@/types/database'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GoldButton } from '@/components/ui/gold-button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { getInitials, formatDate } from '@/lib/utils'
import {
  Search, Plus, User, Phone, MapPin, ChevronRight,
  UserPlus, Home, CreditCard, CheckCircle2, ArrowLeft, ArrowRight,
  Fingerprint,
} from 'lucide-react'

// ── Fetch customers ──────────────────────────────────────────────
async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

// ── Step indicator ───────────────────────────────────────────────
const steps = [
  { id: 1, label: 'Personal', icon: User },
  { id: 2, label: 'Address',  icon: Home },
  { id: 3, label: 'ID Proof', icon: CreditCard },
  { id: 4, label: 'Review',   icon: CheckCircle2 },
]

const StepBar: React.FC<{ current: number }> = ({ current }) => (
  <div className="flex items-center gap-0 mb-6">
    {steps.map((s, idx) => {
      const Icon = s.icon
      const done    = current > s.id
      const active  = current === s.id
      return (
        <React.Fragment key={s.id}>
          <div className="flex flex-col items-center gap-1 flex-1">
            <motion.div
              animate={done ? { scale: [1, 1.15, 1] } : {}}
              className={`h-9 w-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                done
                  ? 'bg-amber-500 border-amber-500 text-white'
                  : active
                  ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'bg-muted border-border text-muted-foreground'
              }`}
            >
              {done
                ? <CheckCircle2 className="h-4 w-4" />
                : <Icon className="h-4 w-4" />
              }
            </motion.div>
            <span className={`text-[10px] font-semibold ${active ? 'text-amber-600 dark:text-amber-400' : done ? 'text-foreground' : 'text-muted-foreground'}`}>
              {s.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div className={`h-0.5 flex-1 mb-4 transition-all duration-500 ${done ? 'bg-amber-500' : 'bg-border'}`} />
          )}
        </React.Fragment>
      )
    })}
  </div>
)

// ── Field component ──────────────────────────────────────────────
const Field: React.FC<{
  id: string; label: string; placeholder?: string
  value: string; onChange: (v: string) => void
  required?: boolean; type?: string; hint?: string
}> = ({ id, label, placeholder, value, onChange, required, type = 'text', hint }) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-xs font-semibold text-foreground/80">
      {label}{required && <span className="text-amber-500 ml-0.5">*</span>}
    </Label>
    <Input
      id={id} type={type} placeholder={placeholder}
      value={value} onChange={e => onChange(e.target.value)}
      required={required}
      className="h-9 text-sm"
    />
    {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
  </div>
)

// ── Review row ───────────────────────────────────────────────────
const ReviewRow: React.FC<{ label: string; value?: string }> = ({ label, value }) =>
  value ? (
    <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold text-foreground">{value}</span>
    </div>
  ) : null

// ── Enroll Dialog ────────────────────────────────────────────────
const EnrollDialog: React.FC<{
  open: boolean; onClose: () => void
  onSuccess: () => void
}> = ({ open, onClose, onSuccess }) => {
  const [step, setStep]             = useState(1)
  // Step 1 — Personal
  const [firstName, setFirstName]             = useState('')
  const [lastName, setLastName]               = useState('')
  const [phone, setPhone]                     = useState('')
  const [altPhone, setAltPhone]               = useState('')
  const [dob, setDob]                         = useState('')
  const [anniversaryDate, setAnniversaryDate] = useState('')
  const [checkingPhone, setCheckingPhone]     = useState(false)
  const [phoneError, setPhoneError]           = useState('')

  // Step 2 — Address
  const [doorNo, setDoorNo]         = useState('')
  const [flatName, setFlatName]     = useState('')
  const [street, setStreet]         = useState('')
  const [landmark, setLandmark]     = useState('')
  const [area, setArea]             = useState('')
  const [city, setCity]             = useState('')
  const [state, setState]           = useState('')
  const [pincode, setPincode]       = useState('')
  // Step 3 — ID Proof, Nominee & Bank
  const [idType, setIdType]                           = useState('')
  const [idNumber, setIdNumber]                       = useState('')
  const [nomineeName, setNomineeName]                 = useState('')
  const [nomineeRelationship, setNomineeRelationship] = useState('')
  const [nomineePhone, setNomineePhone]               = useState('')
  const [bankName, setBankName]                       = useState('')
  const [accountNumber, setAccountNumber]             = useState('')
  const [ifscCode, setIfscCode]                       = useState('')
  const [bankBranch, setBankBranch]                   = useState('')

  const fullName  = [firstName, lastName].filter(Boolean).join(' ')
  const fullAddr  = [doorNo, flatName, street, landmark, area, city, state, pincode].filter(Boolean).join(', ')

  const reset = () => {
    setStep(1)
    setFirstName(''); setLastName(''); setPhone(''); setAltPhone(''); setDob(''); setAnniversaryDate('')
    setCheckingPhone(false); setPhoneError('')
    setDoorNo(''); setFlatName(''); setStreet(''); setLandmark(''); setArea(''); setCity(''); setState(''); setPincode('')
    setIdType(''); setIdNumber('')
    setNomineeName(''); setNomineeRelationship(''); setNomineePhone('')
    setBankName(''); setAccountNumber(''); setIfscCode(''); setBankBranch('')
  }

  const handleClose = () => { reset(); onClose() }

  const handlePhoneChange = (val: string) => {
    const numeric = val.replace(/[^0-9]/g, '').slice(0, 10)
    setPhone(numeric)
    setPhoneError('')
  }

  const handleNextFromStep1 = async () => {
    const cleanPhone = phone.trim()
    if (cleanPhone.length !== 10 || !/^\d{10}$/.test(cleanPhone)) {
      setPhoneError('Mobile number must be exactly 10 numeric digits')
      toast.error('Mobile number must be exactly 10 digits')
      return
    }

    setCheckingPhone(true)
    setPhoneError('')
    try {
      const { data } = await supabase
        .from('customers')
        .select('id, name')
        .eq('phone', cleanPhone)
        .maybeSingle()

      if (data) {
        const msg = `Mobile number ${cleanPhone} is already registered (${data.name || 'Existing Customer'}).`
        setPhoneError(msg)
        toast.error(msg)
        return
      }
      setStep(2)
    } catch (err: any) {
      toast.error('Failed to verify mobile number in database.')
    } finally {
      setCheckingPhone(false)
    }
  }

  const addMutation = useMutation({
    mutationFn: async () => {
      const cleanPhone = phone.trim()
      if (cleanPhone.length !== 10 || !/^\d{10}$/.test(cleanPhone)) {
        throw new Error('Mobile number must be exactly 10 numeric digits!')
      }

      // Check DB uniqueness safety fallback
      const { data: existing } = await supabase
        .from('customers')
        .select('id, name')
        .eq('phone', cleanPhone)
        .maybeSingle()

      if (!doorNo.trim() || !street.trim() || !city.trim() || !pincode.trim()) {
        throw new Error('Address details (Door No, Street, City, Pincode) are mandatory!')
      }
      if (!idType.trim() || !idNumber.trim()) {
        throw new Error('Identity Verification (ID Type and ID Number) are mandatory!')
      }

      const payload: any = {
        name:                 fullName || firstName,
        first_name:           firstName,
        last_name:            lastName || null,
        phone:                cleanPhone,
        dob:                  dob || null,
        anniversary_date:     anniversaryDate || null,
        address:              fullAddr || null,
        door_no:              doorNo   || null,
        flat_name:            flatName || null,
        street:               street   || null,
        landmark:             landmark || null,
        area:                 area     || null,
        city:                 city     || null,
        state:                state    || null,
        pincode:              pincode  || null,
        nominee_name:         nomineeName || null,
        nominee_relationship: nomineeRelationship || null,
        nominee_phone:        nomineePhone || null,
        bank_name:            bankName || null,
        account_number:       accountNumber || null,
        ifsc_code:            ifscCode ? ifscCode.toUpperCase() : null,
        bank_branch:          bankBranch || null,
      }
      let { data, error } = await supabase.from('customers').insert(payload).select().single()
      if (error) {
        const errStr = (error.message + ' ' + (error.details || '') + ' ' + (error.hint || '')).toLowerCase()
        if (
          errStr.includes('flat') ||
          errStr.includes('landmark') ||
          errStr.includes('state') ||
          errStr.includes('dob') ||
          errStr.includes('anniversary') ||
          errStr.includes('nominee') ||
          errStr.includes('bank') ||
          errStr.includes('account') ||
          errStr.includes('ifsc') ||
          errStr.includes('branch') ||
          errStr.includes('column') ||
          errStr.includes('pgrst204')
        ) {
          delete payload.flat_name
          delete payload.landmark
          delete payload.state
          delete payload.dob
          delete payload.anniversary_date
          delete payload.nominee_name
          delete payload.nominee_relationship
          delete payload.nominee_phone
          delete payload.bank_name
          delete payload.account_number
          delete payload.ifsc_code
          delete payload.bank_branch
          const fallback = await supabase.from('customers').insert(payload).select().single()
          data = fallback.data
          error = fallback.error
        }
      }
      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success(`${fullName || firstName} enrolled successfully!`)
      reset()
      onSuccess()
    },
    onError: (err: any) => toast.error(err.message || 'Failed to enroll customer'),
  })

  const handlePincodeChange = (val: string) => {
    setPincode(val.replace(/[^0-9]/g, '').slice(0, 6))
  }

  const handleIdNumberChange = (val: string) => {
    if (idType === 'aadhaar') {
      setIdNumber(val.replace(/[^0-9]/g, '').slice(0, 12))
    } else if (idType === 'pan') {
      setIdNumber(val.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10))
    } else {
      setIdNumber(val.replace(/[^A-Za-z0-9\-\/]/g, '').toUpperCase().slice(0, 16))
    }
  }

  const isPincodeValid = pincode.trim().length === 6 && /^\d{6}$/.test(pincode.trim())
  const isIdValid = idType.trim().length > 0 && (
    idType === 'aadhaar' ? /^\d{12}$/.test(idNumber.trim()) :
    idType === 'pan' ? /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(idNumber.trim()) :
    idNumber.trim().length >= 4
  )

  // Step validation
  const step1Valid = firstName.trim().length > 0 && phone.trim().length === 10
  const step2Valid = doorNo.trim().length > 0 && street.trim().length > 0 && city.trim().length > 0 && isPincodeValid
  const step3Valid = isIdValid

  const slideVariants = {
    enter: { opacity: 0, x: 32 },
    center: { opacity: 1, x: 0 },
    exit:  { opacity: 0, x: -32 },
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[96vw] max-w-2xl p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
            </div>
            Enroll New Customer
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">
            Fill in the customer's details to create their DigiGold profile
          </p>
        </DialogHeader>

        <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-6 overflow-y-auto max-h-[calc(92vh-120px)]">
          <StepBar current={step} />

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: 'easeInOut' }}
            >
              {/* ── Step 1: Personal Info ── */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="h-4 w-4 text-amber-500" />
                    <h3 className="text-sm font-bold text-foreground">Personal Information</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <Field id="firstName" label="First Name" placeholder="Ramesh" value={firstName} onChange={setFirstName} required />
                    <Field id="lastName"  label="Last Name"  placeholder="Kumar"  value={lastName}  onChange={setLastName} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-xs font-semibold text-foreground/80">
                        Mobile Phone <span className="text-amber-500">*</span>
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        maxLength={10}
                        placeholder="9876543210"
                        value={phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        required
                        className={`h-9 text-sm ${phoneError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      />
                      {phoneError ? (
                        <p className="text-[11px] text-red-500 font-semibold">{phoneError}</p>
                      ) : phone.length > 0 && phone.length < 10 ? (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Enter 10 numeric digits ({phone.length}/10)</p>
                      ) : phone.length === 10 ? (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Valid 10-digit number
                        </p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">Primary 10-digit contact number</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="altPhone" className="text-xs font-semibold text-foreground/80">
                        Alternate Phone
                      </Label>
                      <Input
                        id="altPhone"
                        type="tel"
                        maxLength={10}
                        placeholder="9876543210"
                        value={altPhone}
                        onChange={(e) => setAltPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                        className="h-9 text-sm"
                      />
                      <p className="text-[10px] text-muted-foreground">Optional second contact</p>
                    </div>
                  </div>
                  {/* Optional Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="dob" className="text-xs font-semibold text-foreground/80 flex items-center justify-between">
                        <span>Date of Birth</span>
                        <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
                      </Label>
                      <Input
                        id="dob"
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="anniversaryDate" className="text-xs font-semibold text-foreground/80 flex items-center justify-between">
                        <span>Wedding Anniversary</span>
                        <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
                      </Label>
                      <Input
                        id="anniversaryDate"
                        type="date"
                        value={anniversaryDate}
                        onChange={(e) => setAnniversaryDate(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  {/* Live preview avatar */}
                  {firstName && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
                      <div className="h-11 w-11 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-lg">
                        {getInitials(fullName || firstName)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{fullName || firstName}</p>
                        {phone && <p className="text-xs text-muted-foreground">{phone}</p>}
                      </div>
                      <Badge className="ml-auto bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px]">
                        New Member
                      </Badge>
                    </motion.div>
                  )}
                </div>
              )}

              {/* ── Step 2: Address ── */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Home className="h-4 w-4 text-amber-500" />
                    <h3 className="text-sm font-bold text-foreground">Address Details</h3>
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">(Mandatory)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <Field id="doorNo" label="Door / House No." placeholder="12B" value={doorNo} onChange={setDoorNo} required />
                    <Field id="flatName" label="Flat / Apartment Name" placeholder="Royal Palms" value={flatName} onChange={setFlatName} />
                  </div>
                  <Field id="street" label="Street / Road" placeholder="Anna Salai Main Road" value={street} onChange={setStreet} required />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <Field id="landmark" label="Landmark" placeholder="Near Bus Stand" value={landmark} onChange={setLandmark} />
                    <Field id="area" label="Area" placeholder="T. Nagar" value={area} onChange={setArea} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <Field id="city" label="City" placeholder="Chennai" value={city} onChange={setCity} required />
                    <Field id="state" label="State" placeholder="Tamil Nadu" value={state} onChange={setState} />
                    <div className="space-y-1.5">
                      <Label htmlFor="pincode" className="text-xs font-semibold text-foreground/80">
                        PinCode <span className="text-amber-500">*</span>
                      </Label>
                      <Input
                        id="pincode"
                        type="tel"
                        maxLength={6}
                        placeholder="600001"
                        value={pincode}
                        onChange={(e) => handlePincodeChange(e.target.value)}
                        required
                        className="h-9 text-sm"
                      />
                      {pincode.length > 0 && pincode.length < 6 ? (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Enter 6 numeric digits ({pincode.length}/6)</p>
                      ) : pincode.length === 6 ? (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Valid 6-digit PinCode
                        </p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">6-digit postal code</p>
                      )}
                    </div>
                  </div>
                  {/* Address preview */}
                  {(doorNo || flatName || street || landmark || area || city || state || pincode) && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-xl bg-muted/50 border border-border text-xs text-muted-foreground">
                      <p className="font-semibold text-foreground text-[11px] mb-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-amber-500" /> Address Preview
                      </p>
                      {[doorNo, flatName, street, landmark, area, city, state, pincode].filter(Boolean).join(', ')}
                    </motion.div>
                  )}
                </div>
              )}

              {/* ── Step 3: ID Proof ── */}
              {step === 3 && (
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
                    <Select value={idType} onValueChange={(val) => { setIdType(val); setIdNumber(''); }}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select ID type…" />
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
                    <Label htmlFor="idNumber" className="text-xs font-semibold text-foreground/80">
                      ID Number <span className="text-amber-500">*</span>
                    </Label>
                    <Input
                      id="idNumber"
                      value={idNumber}
                      onChange={(e) => handleIdNumberChange(e.target.value)}
                      placeholder={idType === 'aadhaar' ? '12-digit number (e.g. 987654321012)' : idType === 'pan' ? '10-char PAN (e.g. ABCDE1234F)' : 'Enter ID number'}
                      required
                      className="h-9 text-sm uppercase"
                    />
                    {idType === 'aadhaar' && idNumber.length > 0 && idNumber.length < 12 ? (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Enter 12 numeric digits ({idNumber.length}/12)</p>
                    ) : idType === 'aadhaar' && idNumber.length === 12 ? (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Valid 12-digit Aadhaar
                      </p>
                    ) : idType === 'pan' && idNumber.length > 0 && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(idNumber) ? (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Format: 5 letters + 4 digits + 1 letter ({idNumber.length}/10)</p>
                    ) : idType === 'pan' && /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(idNumber) ? (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Valid PAN Number
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">Stored securely for KYC reference</p>
                    )}
                  </div>
                  {idType && idNumber && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                      <CreditCard className="h-4 w-4 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">ID Noted</p>
                        <p className="text-xs text-muted-foreground">{idType.toUpperCase()} · {idNumber}</p>
                      </div>
                    </motion.div>
                  )}

                  {/* ── Nominee Details Section (Optional) ── */}
                  <div className="pt-4 border-t border-border space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-amber-500" /> Nominee Details
                      </h4>
                      <span className="text-[10px] text-muted-foreground font-semibold">(Optional)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="nomineeName" className="text-xs font-semibold text-foreground/80">Nominee Name</Label>
                        <Input
                          id="nomineeName"
                          placeholder="e.g. Sunita Kumar"
                          value={nomineeName}
                          onChange={(e) => setNomineeName(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground/80">Relationship</Label>
                        <Select value={nomineeRelationship} onValueChange={setNomineeRelationship}>
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
                      <Label htmlFor="nomineePhone" className="text-xs font-semibold text-foreground/80">Nominee Phone</Label>
                      <Input
                        id="nomineePhone"
                        type="tel"
                        maxLength={10}
                        placeholder="9876543210"
                        value={nomineePhone}
                        onChange={(e) => setNomineePhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="bankName" className="text-xs font-semibold text-foreground/80">Bank Name</Label>
                        <Input
                          id="bankName"
                          placeholder="e.g. HDFC Bank, SBI..."
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="accountNumber" className="text-xs font-semibold text-foreground/80">Account Number</Label>
                        <Input
                          id="accountNumber"
                          placeholder="Account Number"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="ifscCode" className="text-xs font-semibold text-foreground/80">IFSC Code</Label>
                        <Input
                          id="ifscCode"
                          placeholder="HDFC0001234"
                          value={ifscCode}
                          onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                          className="h-9 text-sm uppercase"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="bankBranch" className="text-xs font-semibold text-foreground/80">Branch Name</Label>
                        <Input
                          id="bankBranch"
                          placeholder="e.g. T. Nagar Branch"
                          value={bankBranch}
                          onChange={(e) => setBankBranch(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 4: Review ── */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-4 w-4 text-amber-500" />
                    <h3 className="text-sm font-bold text-foreground">Review & Confirm</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Personal card */}
                    <div className="rounded-xl border border-border bg-card p-4 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                        <User className="h-3 w-3" /> Personal
                      </p>
                      <ReviewRow label="Full Name" value={fullName || firstName} />
                      <ReviewRow label="Phone" value={phone} />
                      {altPhone && <ReviewRow label="Alt Phone" value={altPhone} />}
                    </div>
                    {/* Address card */}
                    <div className="rounded-xl border border-border bg-card p-4 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                        <Home className="h-3 w-3" /> Address
                      </p>
                      <ReviewRow label="Door No" value={doorNo} />
                      <ReviewRow label="Street" value={street} />
                      <ReviewRow label="Area" value={area} />
                      <ReviewRow label="City" value={city} />
                      <ReviewRow label="Pincode" value={pincode} />
                      {!doorNo && !street && !city && (
                        <p className="text-xs text-muted-foreground italic">No address provided</p>
                      )}
                    </div>
                  </div>
                  {/* ID card */}
                  {idType && (
                    <div className="rounded-xl border border-border bg-card p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                        <CreditCard className="h-3 w-3" /> ID Proof
                      </p>
                      <ReviewRow label="Type"   value={idType.charAt(0).toUpperCase() + idType.slice(1)} />
                      <ReviewRow label="Number" value={idNumber} />
                    </div>
                  )}
                  <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
                    ✓ Ready to enroll. Click <strong>Enroll Customer</strong> to save to the database.
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation Footer */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
            <Button
              variant="outline" size="sm"
              onClick={() => step > 1 ? setStep(s => s - 1) : handleClose()}
              className="gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {step === 1 ? 'Cancel' : 'Back'}
            </Button>

            <div className="flex items-center gap-1.5">
              {steps.map(s => (
                <div key={s.id} className={`h-1.5 rounded-full transition-all duration-300 ${
                  s.id === step ? 'w-5 bg-amber-500' : s.id < step ? 'w-2 bg-amber-500/50' : 'w-2 bg-border'
                }`} />
              ))}
            </div>

            {step < 4 ? (
              <Button
                size="sm"
                onClick={() => step === 1 ? handleNextFromStep1() : setStep(s => s + 1)}
                disabled={
                  (step === 1 && (!step1Valid || checkingPhone)) ||
                  (step === 2 && !step2Valid) ||
                  (step === 3 && !step3Valid)
                }
                className="gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
              >
                {checkingPhone ? (
                  <><span className="animate-spin">⟳</span> Checking…</>
                ) : (
                  <>Next <ArrowRight className="h-3.5 w-3.5" /></>
                )}
              </Button>
            ) : (
              <GoldButton
                size="sm"
                onClick={() => addMutation.mutate()}
                disabled={addMutation.isPending}
                className="gap-1.5"
              >
                {addMutation.isPending ? (
                  <><span className="animate-spin">⟳</span> Enrolling…</>
                ) : (
                  <><CheckCircle2 className="h-3.5 w-3.5" /> Enroll Customer</>
                )}
              </GoldButton>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export const CustomersPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [openAdd, setOpenAdd] = useState(false)

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: fetchCustomers,
  })

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.city?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage members enrolled in gold chit schemes</p>
        </div>
        <GoldButton onClick={() => setOpenAdd(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add New Customer
        </GoldButton>
      </div>

      <EnrollDialog
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSuccess={() => {
          setOpenAdd(false)
          queryClient.invalidateQueries({ queryKey: ['customers'] })
        }}
      />

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone or city…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Customer Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="p-4">
              <Skeleton className="h-12 w-full mb-3" />
              <Skeleton className="h-4 w-3/4" />
            </Card>
          ))}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Card className="p-8 text-center">
          <User className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
          <h3 className="font-semibold text-lg">No customers found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your search or{' '}
            <button onClick={() => setOpenAdd(true)} className="text-amber-500 underline underline-offset-2">
              add a new customer
            </button>.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer, i) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
            >
              <Link to={`/admin/customers/${customer.id}`}>
                <Card className="p-4 hover:border-amber-500/50 hover:shadow-md transition-all group cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={customer.photo_url ?? undefined} />
                        <AvatarFallback className="bg-amber-500/10 text-amber-600 font-bold text-sm">
                          {getInitials(customer.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-foreground group-hover:text-amber-500 transition-colors text-sm">
                          {customer.name}
                        </h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3" /> {customer.phone}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                  {(customer.city || customer.area) && (
                    <div className="mt-3 border-t border-border/60 pt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {[customer.area, customer.city].filter(Boolean).join(', ')}
                      </span>
                      <span>Joined {formatDate(customer.created_at)}</span>
                    </div>
                  )}
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
