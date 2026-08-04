import React from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import {
  LayoutDashboard,
  Layers,
  BookOpen,
  Coins,
  User,
  LogOut,
} from 'lucide-react'

export const CustomerLayout: React.FC = () => {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const bottomNavItems = [
    { label: 'Home', path: '/customer/dashboard', icon: LayoutDashboard },
    { label: 'Schemes', path: '/customer/schemes', icon: Layers },
    { label: 'Passbook', path: '/customer/passbook', icon: BookOpen },
    { label: 'Rates', path: '/customer/rates', icon: Coins },
    { label: 'Profile', path: '/customer/profile', icon: User },
  ]

  const handleSignOut = async () => {
    await signOut()
    navigate('/customer-login')
  }

  return (
    <div className="flex min-h-screen w-screen flex-col bg-background pb-16 md:pb-0">
      {/* Top Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-white shadow-md font-heading font-bold text-base">
            DG
          </div>
          <div>
            <h1 className="font-heading font-bold text-foreground text-base leading-tight">DigiGold</h1>
            <p className="text-[10px] text-muted-foreground font-medium">Customer Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/customer/profile">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback>{getInitials(profile?.full_name ?? 'Customer')}</AvatarFallback>
            </Avatar>
          </Link>
          <Button variant="ghost" size="icon-sm" onClick={handleSignOut} title="Sign Out">
            <LogOut className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-4xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 border-t border-border bg-card/90 backdrop-blur-lg md:hidden">
        {bottomNavItems.map((item) => {
          const Icon = item.icon
          const active = location.pathname.startsWith(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-1 flex-col items-center justify-center gap-1 transition-colors ${
                active ? 'text-amber-500 font-semibold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'scale-110' : ''} transition-transform`} />
              <span className="text-[11px] leading-none">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
