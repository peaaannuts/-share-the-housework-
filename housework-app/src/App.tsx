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

  // Own-scroll-container layout instead of a `position: fixed` bottom nav
  // over document/body scroll. iOS WebKit has known bugs where a fixed
  // element's position gets "frozen" at whatever document coordinate it
  // happened to occupy when its compositing layer was established — as this
  // app's content grows after first paint (Firestore data streaming in), a
  // fixed TabBar could end up stuck mid-page instead of tracking the
  // viewport bottom (reproduced on-device: the bar rendered spliced between
  // two chore rows). A flex column with a bounded, independently-scrolling
  // content area sidesteps the whole bug class — TabBar is a normal, always
  // in-place flex sibling, never `position: fixed`.
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {tab === 'home' && <HomeTab />}
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'history' && <HistoryTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
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
