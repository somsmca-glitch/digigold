import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types/database'
import { Skeleton } from '@/components/ui/skeleton'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-muted-foreground">Loading DigiGold...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    if (allowedRoles?.includes('customer')) {
      return <Navigate to="/customer-login" state={{ from: location }} replace />
    }
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // If logged in customer trying to access admin
    if (role === 'customer') {
      return <Navigate to="/customer/dashboard" replace />
    }
    // If staff/admin trying to access customer portal
    return <Navigate to="/admin/dashboard" replace />
  }

  return <>{children}</>
}
