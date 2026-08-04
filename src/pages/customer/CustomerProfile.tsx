import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { User, Phone, Mail, LogOut, ShieldCheck } from 'lucide-react'

export const CustomerProfile: React.FC = () => {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/customer-login')
  }

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your personal account details</p>
      </div>

      <Card className="p-6 text-center space-y-4">
        <Avatar className="h-20 w-20 mx-auto">
          <AvatarImage src={profile?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-amber-500/10 text-amber-600 font-bold text-2xl">
            {getInitials(profile?.full_name ?? user?.user_metadata?.full_name ?? 'Customer')}
          </AvatarFallback>
        </Avatar>

        <div>
          <h2 className="font-heading font-bold text-xl">{profile?.full_name ?? user?.user_metadata?.full_name ?? 'Customer'}</h2>
          <p className="text-xs text-amber-500 font-semibold mt-0.5 flex items-center justify-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Verified Gold Chit Member
          </p>
        </div>

        <div className="border-t border-border pt-4 text-left text-sm space-y-3">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Phone className="h-4 w-4 text-amber-500" />
            <span className="text-foreground font-medium">{profile?.phone ?? user?.phone ?? 'Mobile not set'}</span>
          </div>

          <div className="flex items-center gap-3 text-muted-foreground">
            <Mail className="h-4 w-4 text-amber-500" />
            <span className="text-foreground font-medium">{profile?.email ?? user?.email ?? 'Email not set'}</span>
          </div>
        </div>

        <Button variant="destructive" className="w-full mt-4" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </Card>
    </div>
  )
}
