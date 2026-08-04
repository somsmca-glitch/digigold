import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'
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
import { RemindersPage } from '@/pages/admin/RemindersPage'
import { ReportsPage } from '@/pages/admin/ReportsPage'
import { SettingsPage } from '@/pages/admin/SettingsPage'

// Customer Pages
import { CustomerDashboard } from '@/pages/customer/CustomerDashboard'
import { CustomerSchemes } from '@/pages/customer/CustomerSchemes'
import { Passbook } from '@/pages/customer/Passbook'
import { Rates } from '@/pages/customer/Rates'
import { CustomerProfile } from '@/pages/customer/CustomerProfile'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
})

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/customer-login" element={<CustomerLoginPage />} />

              {/* Protected Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'staff']}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="customers/:id" element={<CustomerDetailPage />} />
                <Route path="schemes" element={<SchemesPage />} />
                <Route path="gold-rate" element={<GoldRatePage />} />
                <Route path="reminders" element={<RemindersPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
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
              </Route>

              {/* Default Redirect */}
              <Route path="*" element={<Navigate to="/customer-login" replace />} />
            </Routes>
            <Toaster position="top-right" richColors />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
