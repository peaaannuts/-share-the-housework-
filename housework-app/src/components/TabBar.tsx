export type TabKey = 'home' | 'dashboard' | 'history' | 'settings'

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'home', label: 'ホーム', icon: '🏠' },
  { key: 'dashboard', label: 'ダッシュボード', icon: '📊' },
  { key: 'history', label: '履歴', icon: '🕒' },
  { key: 'settings', label: '設定', icon: '⚙️' },
]

export function TabBar({ active, onChange }: { active: TabKey; onChange: (tab: TabKey) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/85 backdrop-blur-lg dark:border-white/10 dark:bg-neutral-900/85">
      <div className="mx-auto flex max-w-lg justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-1.5">
        {TABS.map((tab) => {
          const isActive = active === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-medium transition ${
                isActive
                  ? 'bg-[#c2683f]/10 text-[#c2683f] dark:bg-[#c2683f]/20 dark:text-[#e0a075]'
                  : 'text-neutral-400 dark:text-neutral-500'
              }`}
            >
              <span className={`text-xl leading-none transition ${isActive ? '' : 'opacity-70'}`}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
