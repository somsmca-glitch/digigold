import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { Toaster } from 'sonner'

// Layouts & Protected Route
import { AdminLayout } from '@/components/layout/AdminLayout'
import { CustomerLayout } from '@/components/layout/CustomerLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'

// Auth Pages
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { CustomerLoginPage } from '@/pages/auth/CustomerLoginPage'

// Admin Pages
import { DashboardPage } from '@/pages/admin/DashboardPage'
import { CustomersPage } from '@/pages/admin/CustomersPage'
import { CustomerDetailPage } from '@/pages/admin/CustomerDetailPage'
import { SchemesPage } from '@/pages/admin/SchemesPage'
import { GoldRatePage } from '@/pages/admin/GoldRatePage'
import { BannerManagementPage } from '@/pages/admin/BannerManagementPage'
import { RemindersPage } from '@/pages/admin/RemindersPage'
import { ReportsPage } from '@/pages/admin/reports/ReportsPage'
import { MonthlyCollectionReport } from '@/pages/admin/reports/MonthlyCollectionReport'
import { CollectionTrendReport } from '@/pages/admin/reports/CollectionTrendReport'
import { SchemeStatusReport } from '@/pages/admin/reports/SchemeStatusReport'
import { MaturitiesReport } from '@/pages/admin/reports/MaturitiesReport'
import { CustomerDistributionReport } from '@/pages/admin/reports/CustomerDistributionReport'
import { DefaultedChitsReport } from '@/pages/admin/reports/DefaultedChitsReport'
import { SettingsPage } from '@/pages/admin/SettingsPage'
import { AdminProfilePage } from '@/pages/admin/AdminProfilePage'

// Customer Pages
import { CustomerDashboard } from '@/pages/customer/CustomerDashboard'
import { CustomerSchemes } from '@/pages/customer/CustomerSchemes'
import { Passbook } from '@/pages/customer/Passbook'
import { Rates } from '@/pages/customer/Rates'
import { CustomerProfile } from '@/pages/customer/CustomerProfile'
import { CustomerPayment } from '@/pages/customer/CustomerPayment'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('DigiGold Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen w-screen items-center justify-center bg-background p-6 font-sans">
          <div className="max-w-md w-full p-8 rounded-3xl bg-card border-2 border-amber-500/40 text-center shadow-2xl space-y-4">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 font-extrabold text-2xl">
              DG
            </div>
            <h2 className="text-xl font-bold text-foreground">DigiGold Session Recovery</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We encountered a temporary sync issue. Click below to refresh your passbook session.
            </p>
            {this.state.error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-left">
                <p className="text-[10px] font-bold uppercase text-red-500 mb-1">Error Diagnostic Details:</p>
                <p className="text-xs font-mono text-red-600 dark:text-red-400 break-words">
                  {this.state.error.message || this.state.error.toString()}
                </p>
              </div>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false })
                window.location.href = '/customer/dashboard'
              }}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 text-white font-extrabold text-sm shadow-lg shadow-amber-500/30"
            >
              Refresh DigiGold Dashboard
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
})

const AdminIndexRedirect: React.FC = () => {
  const { role } = useAuth()
  return <Navigate to={role === 'staff' ? '/admin/customers' : '/admin/dashboard'} replace />
}

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/customer-login" element={<CustomerLoginPage />} />
              <Route path="/customer-signup" element={<CustomerLoginPage initialMode="signup" />} />

              {/* Protected Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'staff']}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminIndexRedirect />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="customers/:id" element={<CustomerDetailPage />} />
                <Route path="schemes" element={<SchemesPage />} />
                <Route path="gold-rate" element={<GoldRatePage />} />
                <Route path="banners" element={<BannerManagementPage />} />
                <Route path="reminders" element={<RemindersPage />} />
                <Route path="reports">
                  <Route index element={<ReportsPage />} />
                  <Route path="monthly-collection" element={<MonthlyCollectionReport />} />
                  <Route path="collection-trend" element={<CollectionTrendReport />} />
                  <Route path="scheme-status" element={<SchemeStatusReport />} />
                  <Route path="maturities" element={<MaturitiesReport />} />
                  <Route path="customer-distribution" element={<CustomerDistributionReport />} />
                  <Route path="defaulted-chits" element={<DefaultedChitsReport />} />
                </Route>
                <Route path="settings" element={<SettingsPage />} />
                <Route path="profile" element={<AdminProfilePage />} />
              </Route>

              {/* Protected Customer Routes */}
              <Route
                path="/customer"
                element={
                  <ProtectedRoute allowedRoles={['customer', 'admin', 'staff']}>
                    <CustomerLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/customer/dashboard" replace />} />
                <Route path="dashboard" element={<CustomerDashboard />} />
                <Route path="schemes" element={<CustomerSchemes />} />
                <Route path="passbook" element={<Passbook />} />
                <Route path="rates" element={<Rates />} />
                <Route path="profile" element={<CustomerProfile />} />
                <Route path="pay" element={<CustomerPayment />} />
              </Route>

              {/* Default Redirect */}
              <Route path="*" element={<Navigate to="/customer-login" replace />} />
            </Routes>
            <Toaster position="top-right" richColors />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  )
}
