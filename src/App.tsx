import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import DashboardPage from '@/pages/DashboardPage'
import MuhasabahPage from '@/pages/MuhasabahPage'
import ZikirPage from '@/pages/ZikirPage'
import SolatPage from '@/pages/SolatPage'
import IAMChatPage from '@/pages/IAMChatPage'
import HablumPage from '@/pages/HablumPage'
import AmalanPage from '@/pages/AmalanPage'
import PintuRezekiPage from '@/pages/PintuRezekiPage'
import NotificationSettingsPage from '@/pages/NotificationSettingsPage'
import AdminPage from '@/pages/AdminPage'
import LoginPage from '@/pages/LoginPage'
import OnboardingPage from '@/pages/OnboardingPage'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 5, retry: 1 },
  },
})

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#060d16] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-[#c9a96e15] border border-[#c9a96e30] flex items-center justify-center mx-auto">
          <span className="text-2xl">🌙</span>
        </div>
        <Loader2 size={20} className="text-[#c9a96e] animate-spin mx-auto" />
        <p className="text-[#8a7a65] text-sm">Memuatkan...</p>
      </div>
    </div>
  )
}

function AppRoutes() {
  const { loading } = useAuth()
  const { isAuthenticated, user } = useAuthStore()

  if (loading) return <LoadingScreen />

  // Only require onboarding if explicitly set to false (new accounts created after onboarding was added).
  // undefined/null = existing user or tables not yet created → skip onboarding.
  const needsOnboarding = isAuthenticated && user?.onboarding_complete === false

  return (
    <Routes>
      {/* Public: Login */}
      <Route
        path="/login"
        element={
          !isAuthenticated
            ? <LoginPage />
            : <Navigate to={needsOnboarding ? '/onboarding' : '/dashboard'} replace />
        }
      />

      {/* Onboarding: only for authenticated users who haven't completed it */}
      <Route
        path="/onboarding"
        element={
          !isAuthenticated
            ? <Navigate to="/login" replace />
            : needsOnboarding
            ? <OnboardingPage />
            : <Navigate to="/dashboard" replace />
        }
      />

      {/* Protected: requires auth + completed onboarding */}
      <Route
        path="/"
        element={
          !isAuthenticated
            ? <Navigate to="/login" replace />
            : needsOnboarding
            ? <Navigate to="/onboarding" replace />
            : <Layout />
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="muhasabah" element={<MuhasabahPage />} />
        <Route path="zikir" element={<ZikirPage />} />
        <Route path="solat" element={<SolatPage />} />
        <Route path="iam" element={<IAMChatPage />} />
        <Route path="hablum" element={<HablumPage />} />
        <Route path="amalan" element={<AmalanPage />} />
        <Route path="rezeki" element={<PintuRezekiPage />} />
        <Route path="settings/notifications" element={<NotificationSettingsPage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>

      {/* Catch-all */}
      <Route
        path="*"
        element={
          <Navigate
            to={!isAuthenticated ? '/login' : needsOnboarding ? '/onboarding' : '/dashboard'}
            replace
          />
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
