import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import {
  House,
  Layers,
  BookText,
  Coins,
  User,
  LogOut,
  ChevronDown,
  Globe,
} from 'lucide-react'
import {
  NavHomeIcon,
  NavSchemesIcon,
  NavPassbookIcon,
  NavRatesIcon,
  NavProfileIcon,
} from '@/components/icons/NavGoldIcons'

export const CustomerLayout: React.FC = () => {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [language, setLanguage] = useState<'en' | 'ta' | 'hi'>(
    (localStorage.getItem('app_language') as any) || 'en'
  )

  const navItems = [
    { label: 'Home', path: '/customer/dashboard', iconComponent: NavHomeIcon, icon: House },
    { label: 'Schemes', path: '/customer/schemes', iconComponent: NavSchemesIcon, icon: Layers },
    { label: 'Passbook', path: '/customer/passbook', iconComponent: NavPassbookIcon, icon: BookText },
    { label: 'Rates', path: '/customer/rates', iconComponent: NavRatesIcon, icon: Coins },
  ]

  const handleLanguageChange = (lang: 'en' | 'ta' | 'hi') => {
    setLanguage(lang)
    localStorage.setItem('app_language', lang)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileDropdownOpen && !(e.target as HTMLElement).closest('#customer-profile-menu')) {
        setProfileDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [profileDropdownOpen])

  const handleSignOut = async () => {
    await signOut()
    navigate('/customer-login')
  }

  return (
    <div className="flex min-h-screen w-screen flex-col bg-background pb-[calc(84px+env(safe-area-inset-bottom,0px))] md:pb-0">
      {/* ── Top Header ──────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex pt-[env(safe-area-inset-top,0px)] h-[calc(64px+env(safe-area-inset-top,0px))] items-center justify-between border-b border-border bg-card/80 px-4 md:px-8 backdrop-blur-md shadow-sm">
        {/* Brand */}
        <Link to="/customer/dashboard" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-white shadow-md font-heading font-bold text-base group-hover:scale-105 transition-transform">
            DG
          </div>
          <div>
            <h1 className="font-heading font-extrabold text-foreground text-base leading-tight">DigiGold</h1>
            <p className="text-[10px] text-muted-foreground font-semibold">Customer Portal</p>
          </div>
        </Link>

        {/* Desktop Header Links */}
        <nav className="hidden md:flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/40">
          {navItems.map((item) => {
            const IconComponent = item.iconComponent
            const active = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  active
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                <IconComponent active={active} className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Top-Right Controls */}
        <div className="flex items-center gap-3 relative z-50" id="customer-profile-menu">
          <ThemeToggle />

          {/* Profile Trigger */}
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 p-1 rounded-xl border border-border/80 hover:border-amber-500/40 hover:bg-muted/50 transition-all group focus:outline-none"
          >
            <Avatar className="h-8 w-8 ring-2 ring-transparent group-hover:ring-amber-500/40 transition-all">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-gradient-to-br from-amber-500 to-yellow-600 text-white font-bold text-xs">
                {getInitials(profile?.full_name ?? 'Customer')}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline-block text-xs font-bold text-foreground max-w-[100px] truncate">
              {profile?.full_name || 'My Account'}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180 text-amber-500' : ''}`} />
          </button>

          {/* Dropdown Popup Menu */}
          {profileDropdownOpen && (
            <div className="absolute right-0 top-12 w-64 rounded-2xl bg-card/95 border border-amber-500/30 shadow-2xl p-2 z-[9999] animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl">
              <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/15 mb-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-amber-500/30 shrink-0">
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-amber-500 to-yellow-600 text-white font-bold text-sm">
                      {getInitials(profile?.full_name ?? 'Customer')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-extrabold truncate text-foreground">{profile?.full_name || 'Customer'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{profile?.phone || 'Gold Member'}</p>
                    <span className="inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 mt-1">
                      Gold Member
                    </span>
                  </div>
                </div>
              </div>

              {/* Option 1: Profile */}
              <Link
                to="/customer/profile"
                onClick={() => setProfileDropdownOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              >
                <User className="h-4 w-4 text-amber-500" />
                <span>My Profile &amp; Settings</span>
              </Link>

              {/* Option 2: Language Selector */}
              <div className="pt-2 mt-2 border-t border-border/50 px-3 pb-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Globe className="h-3 w-3 text-amber-500" /> Language Select
                </p>
                <div className="grid grid-cols-3 gap-1 text-[11px] font-bold">
                  {[
                    { code: 'en', label: 'EN' },
                    { code: 'ta', label: 'தமிழ்' },
                    { code: 'hi', label: 'हिंदी' },
                  ].map(l => (
                    <button
                      key={l.code}
                      onClick={() => handleLanguageChange(l.code as any)}
                      className={`py-1 rounded-lg border text-center transition-all ${
                        language === l.code
                          ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                          : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Option 3: Logout */}
              <div className="pt-2 mt-2 border-t border-border/50">
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false)
                    handleSignOut()
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out Account</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────── */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-4xl mx-auto w-full">
        <Outlet />
      </main>

      {/* ── Mobile Bottom Navigation ────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom,0px)] h-[calc(68px+env(safe-area-inset-bottom,0px))] border-t border-amber-500/20 bg-card/90 backdrop-blur-2xl md:hidden shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
        <div className="flex h-full items-center justify-around px-2">
          {[
            ...navItems,
            { label: 'Profile', path: '/customer/profile', iconComponent: NavProfileIcon, icon: User },
          ].map((item) => {
            const IconComponent = item.iconComponent
            const active = location.pathname.startsWith(item.path)

            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative flex flex-1 flex-col items-center justify-center py-1 group select-none"
              >
                {/* Icon Container */}
                <motion.div
                  animate={active ? { scale: 1.12, y: -1 } : { scale: 1, y: 0 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 24, mass: 0.8 }}
                  className="relative z-10 mb-0.5 flex items-center justify-center"
                >
                  <IconComponent
                    active={active}
                    className="h-6 w-6 transition-all duration-300"
                  />
                </motion.div>

                {/* Label Text */}
                <span
                  className={`relative z-10 text-[10px] tracking-tight transition-colors duration-200 ${
                    active
                      ? 'font-black text-amber-600 dark:text-amber-400'
                      : 'font-semibold text-gray-400 dark:text-gray-500 group-hover:text-foreground'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
