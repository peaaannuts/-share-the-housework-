import { useState } from 'react'
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt'
import { TabBar, type TabKey } from './components/TabBar'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { HouseholdProvider, useHousehold } from './contexts/HouseholdContext'
import { ToastProvider } from './contexts/ToastContext'
import { DashboardTab } from './screens/DashboardTab'
import { HistoryTab } from './screens/HistoryTab'
import { HomeTab } from './screens/HomeTab'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { SettingsTab } from './screens/SettingsTab'

function LoadingScreen() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3">
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-blue-200 border-t-blue-500" />
      <p className="text-sm text-neutral-400">読み込み中...</p>
    </div>
  )
}

function AppShell() {
  const { loading: authLoading } = useAuth()
  const { loading: householdLoading, household } = useHousehold()
  const [tab, setTab] = useState<TabKey>('home')

  if (authLoading || householdLoading) {
    return <LoadingScreen />
  }

  if (!household) {
    return <OnboardingScreen />
  }

  return (
    <div className="min-h-full">
      {tab === 'home' && <HomeTab />}
      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'history' && <HistoryTab />}
      {tab === 'settings' && <SettingsTab />}
      <TabBar active={tab} onChange={setTab} />
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <HouseholdProvider>
        <ToastProvider>
          <AppShell />
          <PwaUpdatePrompt />
        </ToastProvider>
      </HouseholdProvider>
    </AuthProvider>
  )
}

export default App
