import React, { useState } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { Customer } from '@/types/database'
import { getInitials } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Layers,
  Coins,
  Bell,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ShieldAlert,
  User,
  Globe,
  ChevronDown,
  Search,
  Loader2,
  Command,
  Phone,
  MapPin,
} from 'lucide-react'

import { DailyRateUpdateAlertModal } from '@/components/admin/DailyRateUpdateAlertModal'

export const AdminLayout: React.FC = () => {
  const { role, profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [language, setLanguage] = useState<'en' | 'ta' | 'hi'>(
    (localStorage.getItem('app_language') as any) || 'en'
  )

  // ── Global Search Command Palette State ─────────────────────────
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Customer[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Global Keyboard shortcut listener (Ctrl+K / Cmd+K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Instant Customer Search query handler
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      const q = searchQuery.trim()
      const { data } = await supabase
        .from('customers')
        .select('*')
        .or(`name.ilike.%${q}%,phone.ilike.%${q}%,city.ilike.%${q}%`)
        .limit(8)
      setSearchResults(data || [])
      setIsSearching(false)
    }, 200)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleLanguageChange = (lang: 'en' | 'ta' | 'hi') => {
    setLanguage(lang)
    localStorage.setItem('app_language', lang)
  }

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileDropdownOpen && !(e.target as HTMLElement).closest('#user-profile-menu')) {
        setProfileDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [profileDropdownOpen])

  const allNavItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard, roles: ['admin'] },
    { label: 'Customers', path: '/admin/customers', icon: Users, roles: ['admin', 'staff'] },
    { label: 'Chit Schemes', path: '/admin/schemes', icon: Layers, roles: ['admin', 'staff'] },
    { label: 'Gold Rates', path: '/admin/gold-rate', icon: Coins, roles: ['admin', 'staff'] },
    { label: 'Promo Banners', path: '/admin/banners', icon: FileText, roles: ['admin', 'staff'] },
    { label: 'Reminders', path: '/admin/reminders', icon: Bell, roles: ['admin', 'staff'] },
    { label: 'Reports', path: '/admin/reports', icon: FileText, roles: ['admin'] },
    { label: 'Settings', path: '/admin/settings', icon: Settings, roles: ['admin'] },
  ]

  const userRole = role || 'admin'
  const navItems = allNavItems.filter((item) => item.roles.includes(userRole as any))

  // Redirect staff from restricted pages (Dashboard, Reports, Settings) to Customers
  React.useEffect(() => {
    if (userRole === 'staff') {
      const isProfilePage = location.pathname.startsWith('/admin/profile')
      const isAllowed = isProfilePage || navItems.some((item) => location.pathname.startsWith(item.path))
      if (!isAllowed) {
        navigate('/admin/customers', { replace: true })
      }
    }
  }, [userRole, location.pathname, navigate])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card/60 backdrop-blur-md">
        {/* Brand Header */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-white shadow-md">
            <span className="font-heading font-bold text-lg">DG</span>
          </div>
          <div>
            <h1 className="font-heading text-lg font-bold tracking-wide text-foreground">DigiGold</h1>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Admin Panel</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {active && <ChevronRight className="ml-auto h-4 w-4 opacity-70" />}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar with elevated z-index */}
        <header className="relative z-40 flex pt-[env(safe-area-inset-top,0px)] h-[calc(64px+env(safe-area-inset-top,0px))] items-center justify-between border-b border-border bg-card/40 px-6 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <h2 className="text-base font-semibold text-foreground capitalize">
              {location.pathname.startsWith('/admin/profile')
                ? 'My Profile'
                : (navItems.find((n) => location.pathname.startsWith(n.path))?.label ?? 'Dashboard')}
            </h2>
          </div>

          <div className="flex items-center gap-3 relative z-50" id="user-profile-menu">
            {/* Quick Search Command Palette Trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted/80 text-xs text-muted-foreground transition-all group"
            >
              <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-amber-500 transition-colors" />
              <span className="hidden sm:inline font-medium">Search customers...</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border bg-card text-[10px] font-mono text-muted-foreground">
                <Command className="h-2.5 w-2.5" /> K
              </kbd>
            </button>

            <ThemeToggle />

            {/* Profile Avatar Button Trigger */}
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2.5 p-1.5 rounded-xl border border-border/80 hover:border-amber-500/40 hover:bg-muted/50 transition-all group focus:outline-none"
            >
              <Avatar className="h-8 w-8 ring-2 ring-transparent group-hover:ring-amber-500/40 transition-all">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-gradient-to-br from-amber-500 to-yellow-600 text-white font-bold text-xs">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left max-w-[120px]">
                <p className="text-xs font-bold truncate text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  {profile?.full_name ?? 'Admin User'}
                </p>
                <p className="text-[10px] text-muted-foreground capitalize leading-none mt-0.5">
                  {profile?.role || 'Admin'}
                </p>
              </div>
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180 text-amber-500' : ''}`} />
            </button>

            {/* Dropdown Popup Menu - Highest z-index to overlay all page elements */}
            {profileDropdownOpen && (
              <div className="absolute right-0 top-12 w-64 rounded-2xl bg-card/95 border border-amber-500/30 shadow-2xl p-2 z-[9999] animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl">
                {/* User Info Header */}
                <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/15 mb-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-amber-500/30 shrink-0">
                      <AvatarImage src={profile?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-amber-500 to-yellow-600 text-white font-bold text-sm">
                        {getInitials(profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-extrabold truncate text-foreground">{profile?.full_name || 'Admin User'}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{profile?.email || 'User Account'}</p>
                      <span className="inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 mt-1">
                        {profile?.role || 'Admin'} Account
                      </span>
                    </div>
                  </div>
                </div>

                {/* Option 1: Profile Link */}
                <Link
                  to="/admin/profile"
                  onClick={() => setProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  <User className="h-4 w-4 text-amber-500" />
                  <span>My Profile &amp; Settings</span>
                </Link>

                {/* Option 2: Language Select Submenu */}
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
                    <span>Log Out Account</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Mobile Sidebar Overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)}>
            <aside
              className="w-64 h-full bg-card p-4 space-y-4 border-r border-border shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold">
                    DG
                  </div>
                  <span className="font-heading font-bold text-lg">DigiGold</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const active = location.pathname.startsWith(item.path)
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                        active
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Outlet View */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-[calc(88px+env(safe-area-inset-bottom,0px))] lg:pb-8">
          <Outlet />
        </main>

        {/* ── Mobile Bottom Navigation (Admin) ────────────────────────── */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom,0px)] h-[calc(68px+env(safe-area-inset-bottom,0px))] border-t border-amber-500/20 bg-card/90 backdrop-blur-2xl lg:hidden shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
          <div className="flex h-full items-center justify-around px-2">
            {[
              { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
              { label: 'Customers', path: '/admin/customers', icon: Users },
              { label: 'Schemes', path: '/admin/schemes', icon: Layers },
              { label: 'Rates', path: '/admin/gold-rate', icon: Coins },
              { label: 'Profile', path: '/admin/profile', icon: User },
            ].map((item) => {
              const Icon = item.icon
              const active = location.pathname.startsWith(item.path)

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative flex flex-1 flex-col items-center justify-center py-1 group select-none"
                >
                  {/* Top Highlight Line */}
                  {active && (
                    <motion.div
                      layoutId="admin-nav-active-line"
                      className="absolute top-0 h-1 w-8 rounded-b-full bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 shadow-[0_2px_10px_rgba(245,158,11,0.85)]"
                      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                    />
                  )}

                  {/* Icon Container with Scale and Spring Motion */}
                  <motion.div
                    animate={active ? { scale: 1.3, y: -3 } : { scale: 1, y: 0 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 24, mass: 0.8 }}
                    className="relative z-10 mb-0.5 flex items-center justify-center"
                  >
                    <Icon
                      className={`h-5 w-5 transition-all duration-300 ${
                        active
                          ? 'text-amber-500 dark:text-amber-400 drop-shadow-[0_3px_10px_rgba(245,158,11,0.7)]'
                          : 'text-muted-foreground/70 group-hover:text-foreground'
                      }`}
                    />
                  </motion.div>

                  {/* Label Text */}
                  <motion.span
                    animate={active ? { scale: 1.08, y: -1 } : { scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    className={`relative z-10 text-[10px] tracking-tight transition-colors duration-200 ${
                      active
                        ? 'font-extrabold text-amber-600 dark:text-amber-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]'
                        : 'font-medium text-muted-foreground/75 group-hover:text-foreground'
                    }`}
                  >
                    {item.label}
                  </motion.span>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* ── Global Search Command Palette Modal ─────────────────── */}
        <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
          <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden rounded-2xl border border-amber-500/30 shadow-2xl">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
              <Search className="h-4 w-4 text-amber-500 shrink-0" />
              <Input
                placeholder="Search customers by name, phone, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm h-8 px-0"
              />
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin text-amber-500 shrink-0" />
              ) : searchQuery ? (
                <button onClick={() => setSearchQuery('')} className="text-xs text-muted-foreground hover:text-foreground">
                  Clear
                </button>
              ) : null}
            </div>

            <div className="max-h-[360px] overflow-y-auto p-2">
              {!searchQuery.trim() ? (
                <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground">Global Quick Search</p>
                  <p>Type customer name, phone number, or city to jump directly to their profile.</p>
                </div>
              ) : isSearching ? (
                <div className="py-8 text-center text-xs text-muted-foreground">Searching database...</div>
              ) : searchResults.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">No matching customers found.</div>
              ) : (
                <div className="space-y-1">
                  <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Matching Customers ({searchResults.length})
                  </p>
                  {searchResults.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSearchOpen(false)
                        setSearchQuery('')
                        navigate(`/admin/customers/${c.id}`)
                      }}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-amber-500/10 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-amber-500/30">
                          <AvatarFallback className="bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-xs">
                            {getInitials(c.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-bold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {c.name}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-amber-500" /> {c.phone}
                            </span>
                            {c.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-muted-foreground" /> {c.city}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* ── ⏰ Twice-Daily Rate Update Alert Pop-up Modal ── */}
        <DailyRateUpdateAlertModal />
      </div>
    </div>
  )
}
