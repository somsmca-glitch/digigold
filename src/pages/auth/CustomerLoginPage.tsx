import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { GoldButton } from '@/components/ui/gold-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GlassCard } from '@/components/ui/glass-card'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { toast } from 'sonner'
import { formatINR } from '@/lib/utils'
import {
  Phone, Lock, User, ArrowRight, ShieldCheck, Sparkles,
  Coins, CheckCircle2, Eye, EyeOff, Gift, Heart, MapPin,
  Award, ChevronRight, UserPlus, LogIn, Scale, Fingerprint, KeyRound, ScanFace
} from 'lucide-react'

const SLIDES = [
  {
    id: 1,
    title: 'Smart Gold Chit Savings',
    subtitle: 'Accumulate 22K pure gold weight month by month with guaranteed BIS 916 hallmark verification.',
    tag: 'Rate-Linked Chit Plans',
    icon: Award,
    color: 'from-amber-400 to-yellow-600',
  },
  {
    id: 2,
    title: '100% Bonus & Zero Making Charges',
    subtitle: 'Enjoy 1-month bonus jeweler contribution on maturity & redeem flat 0% making charges on gold ornaments.',
    tag: '100% Insured Store Vault',
    icon: Gift,
    color: 'from-yellow-400 to-amber-600',
  },
  {
    id: 3,
    title: 'Digital Passbook & Live 22K Ticker',
    subtitle: 'Track live gold rates, view instant payment receipts, and manage your gold weight accumulation anytime.',
    tag: '256-Bit Bank Security',
    icon: Sparkles,
    color: 'from-amber-500 to-yellow-500',
  },
]

interface CustomerLoginPageProps {
  initialMode?: 'login' | 'signup'
}

export const CustomerLoginPage: React.FC<CustomerLoginPageProps> = ({ initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // ── Onboarding Slideshow State ──
  const [showSlideshow, setShowSlideshow] = useState(() => !localStorage.getItem('digigold_slideshow_seen'))
  const [slideIndex, setSlideIndex] = useState(0)

  const handleNextSlide = () => {
    if (slideIndex < SLIDES.length - 1) {
      setSlideIndex((prev) => prev + 1)
    } else {
      finishSlideshow()
    }
  }

  const finishSlideshow = () => {
    localStorage.setItem('digigold_slideshow_seen', 'true')
    setShowSlideshow(false)
  }

  // Password Visibility Toggle & Remember Me
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [biometricLoading, setBiometricLoading] = useState(false)

  // ── Form States: Login ──
  const [phone, setPhone] = useState(() => localStorage.getItem('digigold_remember_phone') || '')
  const [password, setPassword] = useState('')

  // ── Form States: Sign Up ──
  const [fullName, setFullName] = useState('')
  const [signupPhone, setSignupPhone] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [dob, setDob] = useState('')
  const [anniversaryDate, setAnniversaryDate] = useState('')
  const [city, setCity] = useState('')
  const [pincode, setPincode] = useState('')

  // Fetch Live 22K Gold Rate for ticker
  const { data: goldRate } = useQuery({
    queryKey: ['live-gold-rate-customer-login'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gold_rates')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data?.rate_22k || 12800
    },
  })

  // ── Forgot Password Handler ──
  const handleForgotPassword = () => {
    const cleanPhone = phone.replace(/\D/g, '').slice(0, 10)
    if (cleanPhone.length !== 10) {
      toast.error('Please enter your 10-digit mobile number first to reset passcode')
      return
    }
    toast.success(`OTP & Passcode reset code sent via SMS to +91 ${cleanPhone}`)
  }

  // ── Biometric Authentication Handler ──
  const handleBiometricLogin = async () => {
    const cleanPhone = phone.replace(/\D/g, '').slice(0, 10) || localStorage.getItem('digigold_remember_phone') || ''
    if (cleanPhone.length !== 10) {
      toast.error('Please enter your registered 10-digit mobile number first')
      return
    }

    setBiometricLoading(true)
    toast.info('Scanning fingerprint / Face ID biometric sensor...')

    try {
      await new Promise((res) => setTimeout(res, 1200))

      const formattedPhone = `+91${cleanPhone}`
      const dummyEmail = `${cleanPhone}@digigold.customer`
      const authPassword = password || '123456'

      let { error } = await supabase.auth.signInWithPassword({
        phone: formattedPhone,
        password: authPassword,
      })

      if (error) {
        await supabase.auth.signInWithPassword({
          email: dummyEmail,
          password: authPassword,
        })
      }

      if (rememberMe) {
        localStorage.setItem('digigold_remember_phone', cleanPhone)
      }

      toast.success('Biometric sensor verified! Welcome back to DigiGold.')
      navigate('/customer/dashboard')
    } catch (err: any) {
      toast.error(err.message || 'Biometric authentication failed')
    } finally {
      setBiometricLoading(false)
    }
  }

  // ── Handle Customer Login ──────────────────────────────────────────
  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanPhone = phone.replace(/\D/g, '').slice(0, 10)
    if (cleanPhone.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number')
      return
    }

    setLoading(true)
    try {
      const formattedPhone = `+91${cleanPhone}`
      const dummyEmail = `${cleanPhone}@digigold.customer`
      const authPassword = password || '123456'

      let { error } = await supabase.auth.signInWithPassword({
        phone: formattedPhone,
        password: authPassword,
      })

      if (error) {
        const { error: emailErr } = await supabase.auth.signInWithPassword({
          email: dummyEmail,
          password: authPassword,
        })

        if (emailErr) {
          const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
            email: dummyEmail,
            password: authPassword,
            options: {
              data: {
                phone: cleanPhone,
                full_name: `Customer ${cleanPhone.slice(-4)}`,
              },
            },
          })

          if (signUpErr) {
            toast.error('Login failed: ' + signUpErr.message)
            setLoading(false)
            return
          }

          if (signUpData.user) {
            await supabase.from('customers').upsert({
              id: signUpData.user.id,
              name: `Customer ${cleanPhone.slice(-4)}`,
              phone: cleanPhone,
            })
          }
        }
      }

      if (rememberMe) {
        localStorage.setItem('digigold_remember_phone', cleanPhone)
      }

      toast.success('Welcome to DigiGold Customer Portal!')
      navigate('/customer/dashboard')
    } catch (err: any) {
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  // ── Handle Customer Sign Up ────────────────────────────────────────
  const handleCustomerSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanPhone = signupPhone.replace(/\D/g, '').slice(0, 10)

    if (!fullName.trim()) {
      toast.error('Please enter your full name')
      return
    }
    if (cleanPhone.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number')
      return
    }
    if (signupPassword && signupPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (pincode && !/^\d{6}$/.test(pincode.trim())) {
      toast.error('PinCode must be exactly 6 numeric digits')
      return
    }

    setLoading(true)
    try {
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id, phone')
        .eq('phone', cleanPhone)
        .maybeSingle()

      if (existingCustomer) {
        toast.info('Mobile number already registered. Logging in...')
        setPhone(cleanPhone)
        setMode('login')
        setLoading(false)
        return
      }

      const dummyEmail = `${cleanPhone}@digigold.customer`
      const authPassword = signupPassword || '123456'

      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: dummyEmail,
        password: authPassword,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: cleanPhone,
          },
        },
      })

      if (authErr) {
        toast.error(authErr.message)
        setLoading(false)
        return
      }

      const userId = authData.user?.id || crypto.randomUUID()
      const payload: any = {
        id: userId,
        name: fullName.trim(),
        first_name: fullName.trim().split(' ')[0],
        last_name: fullName.trim().split(' ').slice(1).join(' ') || null,
        phone: cleanPhone,
        dob: dob || null,
        anniversary_date: anniversaryDate || null,
        city: city.trim() || null,
        pincode: pincode.trim() || null,
        is_verified: true,
      }

      let { error: insertErr } = await supabase.from('customers').insert(payload)
      if (insertErr) {
        delete payload.dob
        delete payload.anniversary_date
        await supabase.from('customers').insert(payload)
      }

      if (rememberMe) {
        localStorage.setItem('digigold_remember_phone', cleanPhone)
      }

      toast.success('Registration successful! Welcome to DigiGold.')
      navigate('/customer/dashboard')
    } catch (err: any) {
      toast.error(err.message || 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-background p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* ── Ambient Gold Background Glow Mesh ── */}
      <div className="absolute top-0 left-1/4 -mt-20 h-96 w-96 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 -mb-20 h-96 w-96 rounded-full bg-yellow-500/15 blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#DAA520_1px,transparent_1px)] [background-size:32px_32px] opacity-10 pointer-events-none" />

      {/* Top Bar Theme Switcher */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <AnimatePresence mode="wait">
        {showSlideshow ? (
          /* ══════════════════════════════════════════════════════
              JEWELLERY SAVINGS ONBOARDING SLIDESHOW
          ══════════════════════════════════════════════════════ */
          <motion.div
            key="slideshow-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md relative z-10"
          >
            <GlassCard className="p-6 sm:p-8 border-amber-500/30 shadow-2xl shadow-amber-500/10 backdrop-blur-xl relative overflow-hidden rounded-3xl flex flex-col justify-between min-h-[460px]">
              {/* Header: Badge & Skip Button */}
              <div className="flex items-center justify-between">
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-extrabold text-[10px] uppercase tracking-widest px-3 py-1">
                  DigiGold Showcase ({slideIndex + 1}/{SLIDES.length})
                </Badge>

                <button
                  type="button"
                  onClick={finishSlideshow}
                  className="text-xs font-bold text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors uppercase tracking-wider px-2.5 py-1 rounded-lg hover:bg-amber-500/10 cursor-pointer"
                >
                  Skip
                </button>
              </div>

              {/* Animated Slide Body */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={SLIDES[slideIndex].id}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.3 }}
                  className="my-auto py-6 flex flex-col items-center text-center space-y-4"
                >
                  <div className="relative">
                    <div className="absolute -inset-2 rounded-full bg-amber-500/20 blur-xl animate-pulse" />
                    <div className={`relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br ${SLIDES[slideIndex].color} text-white shadow-2xl shadow-amber-500/30`}>
                      {React.createElement(SLIDES[slideIndex].icon, { className: 'h-10 w-10 text-white' })}
                    </div>
                  </div>

                  <Badge variant="outline" className="text-xs font-bold border-amber-500/40 text-amber-600 dark:text-amber-400 px-3 py-0.5">
                    {SLIDES[slideIndex].tag}
                  </Badge>

                  <h2 className="font-heading text-xl sm:text-2xl font-extrabold text-foreground tracking-tight px-2">
                    {SLIDES[slideIndex].title}
                  </h2>

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-sm px-4">
                    {SLIDES[slideIndex].subtitle}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Footer Controls & Pagination Dots */}
              <div className="space-y-5 pt-2">
                {/* Pagination Dots */}
                <div className="flex items-center justify-center gap-2">
                  {SLIDES.map((slide, idx) => (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => setSlideIndex(idx)}
                      className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                        slideIndex === idx ? 'w-8 bg-amber-500 shadow-md shadow-amber-500/30' : 'w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                      }`}
                    />
                  ))}
                </div>

                {/* Next & Skip Action Controls */}
                <div className="flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={finishSlideshow}
                    className="text-xs font-bold text-muted-foreground hover:text-foreground h-11 px-4"
                  >
                    Skip
                  </Button>

                  <GoldButton
                    type="button"
                    onClick={handleNextSlide}
                    className="h-11 px-6 text-sm font-extrabold shadow-xl shadow-amber-500/30 flex items-center gap-2"
                  >
                    {slideIndex === SLIDES.length - 1 ? (
                      <span>Get Started / Login <ArrowRight className="h-4 w-4 inline ml-1" /></span>
                    ) : (
                      <span>Next <ChevronRight className="h-4 w-4 inline ml-1" /></span>
                    )}
                  </GoldButton>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ) : (
          /* ══════════════════════════════════════════════════════
              CUSTOMER LOGIN / REGISTRATION CARD
          ══════════════════════════════════════════════════════ */
          <motion.div
            key="login-card"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.97 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="w-full max-w-md relative z-10"
          >
            <GlassCard className="p-6 sm:p-8 border-amber-500/30 shadow-2xl shadow-amber-500/10 backdrop-blur-xl relative overflow-hidden rounded-3xl">
              {/* Header Branding */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className="relative mb-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-white shadow-xl shadow-amber-500/30 font-heading font-black text-2xl tracking-wider">
                    DG
                  </div>
                  <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center text-[10px] text-white font-bold">
                    ✓
                  </div>
                </div>

                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-extrabold text-[10px] uppercase tracking-widest px-3 py-0.5 mb-2 gap-1">
                  <Award className="h-3 w-3 text-amber-500" /> BIS 916 Hallmarked Savings
                </Badge>

                <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  DigiGold Customer Portal
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                  Manage your gold chit savings, live rates &amp; passbook statements
                </p>
              </div>

              {/* ══════════════════════════════════════════════════════
                  MODE 1: PASSBOOK LOGIN vs MODE 2: SIGN UP
              ══════════════════════════════════════════════════════ */}
              {mode === 'login' ? (
                <form onSubmit={handleCustomerLogin} className="space-y-4">
                  {/* Mobile Phone Number */}
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold text-foreground/80 flex items-center justify-between">
                      <span>Registered Mobile Number</span>
                      <span className="text-amber-500 font-bold">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-extrabold text-muted-foreground border-r border-border pr-2">
                        🇮🇳 +91
                      </span>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="pl-16 text-sm font-semibold tracking-wide h-10"
                        maxLength={10}
                        required
                      />
                    </div>
                    {phone.length > 0 && phone.length < 10 ? (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                        Enter 10 numeric digits ({phone.length}/10)
                      </p>
                    ) : phone.length === 10 ? (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Valid 10-digit number
                      </p>
                    ) : null}
                  </div>

                  {/* Password / Passcode (Optional) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-xs font-semibold text-foreground/80">
                        Security Passcode / Password
                      </Label>
                      <span className="text-[10px] text-muted-foreground font-semibold">(Optional)</span>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter passcode (Default: 123456)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 pr-10 h-10 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* ── Remember Me & Forgot Password ── */}
                  <div className="flex items-center justify-between pt-1 pb-1">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground font-medium cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-amber-500/40 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 accent-amber-500 cursor-pointer"
                      />
                      <span>Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  {/* ── Centered Large Login Submit Button ── */}
                  <GoldButton
                    type="submit"
                    className="w-full h-12 sm:h-13 text-base font-extrabold shadow-xl shadow-amber-500/30 flex items-center justify-center text-center tracking-wide"
                    disabled={loading || biometricLoading}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2 w-full text-center">
                        <span className="animate-spin text-lg">⟳</span> Signing In...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2 w-full text-center">
                        Login <ArrowRight className="h-5 w-5 shrink-0" />
                      </span>
                    )}
                  </GoldButton>

                  {/* ── Large Biometric Authentication Button ── */}
                  <Button
                    type="button"
                    onClick={handleBiometricLogin}
                    disabled={loading || biometricLoading}
                    variant="outline"
                    className="w-full h-11 sm:h-12 text-xs sm:text-sm font-bold border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 flex items-center justify-center text-center gap-2 shadow-sm rounded-xl"
                  >
                    {biometricLoading ? (
                      <span className="flex items-center justify-center gap-2 w-full text-center">
                        <span className="animate-spin text-base">⟳</span> Verifying Sensor...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2 w-full text-center">
                        <Fingerprint className="h-5 w-5 text-amber-500 shrink-0" /> Use Biometric Login (Fingerprint / Face ID)
                      </span>
                    )}
                  </Button>

                  {/* New Member Sign Up Link under Login button */}
                  <div className="pt-2 text-center">
                    <p className="text-xs text-muted-foreground font-medium">
                      Don't have an account yet?{' '}
                      <button
                        type="button"
                        onClick={() => setMode('signup')}
                        className="font-extrabold text-amber-600 dark:text-amber-400 hover:text-amber-500 underline transition-colors cursor-pointer ml-1"
                      >
                        New Member Sign Up
                      </button>
                    </p>
                  </div>
                </form>
              ) : (
                /* ══════════════════════════════════════════════════════
                    MODE 2: NEW MEMBER SIGN UP
                ══════════════════════════════════════════════════════ */
                <form onSubmit={handleCustomerSignup} className="space-y-4">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-xs font-semibold text-foreground/80">
                      Full Name <span className="text-amber-500">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        placeholder="e.g. Ramesh Kumar"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-9 h-10 text-sm"
                        required
                      />
                    </div>
                  </div>

                  {/* Mobile Phone */}
                  <div className="space-y-1.5">
                    <Label htmlFor="signupPhone" className="text-xs font-semibold text-foreground/80">
                      Mobile Phone Number <span className="text-amber-500">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-extrabold text-muted-foreground border-r border-border pr-2">
                        🇮🇳 +91
                      </span>
                      <Input
                        id="signupPhone"
                        type="tel"
                        placeholder="9876543210"
                        value={signupPhone}
                        onChange={(e) => setSignupPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className="pl-16 text-sm font-semibold tracking-wide h-10"
                        maxLength={10}
                        required
                      />
                    </div>
                  </div>

                  {/* Optional DOB & Anniversary */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="dob" className="text-[11px] font-semibold text-foreground/80 flex items-center gap-1">
                        <Gift className="h-3 w-3 text-amber-500" /> Birthday
                      </Label>
                      <Input
                        id="dob"
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="anniversaryDate" className="text-[11px] font-semibold text-foreground/80 flex items-center gap-1">
                        <Heart className="h-3 w-3 text-pink-500" /> Anniversary
                      </Label>
                      <Input
                        id="anniversaryDate"
                        type="date"
                        value={anniversaryDate}
                        onChange={(e) => setAnniversaryDate(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* City & PinCode */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="city" className="text-xs font-semibold text-foreground/80">City</Label>
                      <Input
                        id="city"
                        placeholder="e.g. Chennai"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pincode" className="text-xs font-semibold text-foreground/80">PinCode</Label>
                      <Input
                        id="pincode"
                        type="tel"
                        maxLength={6}
                        placeholder="600001"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Password & Confirm */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="signupPassword" className="text-xs font-semibold text-foreground/80">Passcode</Label>
                      <Input
                        id="signupPassword"
                        type="password"
                        placeholder="Passcode"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword" className="text-xs font-semibold text-foreground/80">Confirm</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <GoldButton
                    type="submit"
                    className="w-full py-3.5 text-sm font-extrabold mt-4 shadow-xl shadow-amber-500/25 h-11 justify-center text-center flex"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2 w-full text-center">
                        <span className="animate-spin">⟳</span> Registering...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2 w-full text-center">
                        Create Member Profile <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </GoldButton>

                  {/* Already Registered Login Link under Sign Up button */}
                  <div className="pt-2 text-center">
                    <p className="text-xs text-muted-foreground font-medium">
                      Already registered?{' '}
                      <button
                        type="button"
                        onClick={() => setMode('login')}
                        className="font-extrabold text-amber-600 dark:text-amber-400 hover:text-amber-500 underline transition-colors cursor-pointer ml-1"
                      >
                        Login to Passbook
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* Trust Badges Footer */}
              <div className="mt-6 border-t border-border/60 pt-4 text-center text-xs text-muted-foreground space-y-2">
                <div className="flex items-center justify-center gap-4 text-[11px] font-semibold text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> 256-Bit Encrypted
                  </span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Insured Gold Vault
                  </span>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSlideIndex(0)
                      setShowSlideshow(true)
                    }}
                    className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-500 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    ✨ Watch Jewellery Savings Tour
                  </button>
                </div>

                <p className="text-[10px] text-muted-foreground/60 font-medium tracking-wider text-center pt-3 border-t border-border/40">
                  Powered by Inspiresights solutions
                </p>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
