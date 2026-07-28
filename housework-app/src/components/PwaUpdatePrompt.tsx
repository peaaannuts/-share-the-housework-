import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Shows a banner when a new deployed version is ready, so users don't keep
 * running a stale build indefinitely (PWAs added to the home screen don't
 * reliably background-check for updates, especially on iOS).
 */
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('service worker registration failed', error)
    },
  })

  if (!needRefresh) return null

  return (
    <div className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-full bg-neutral-900 px-5 py-3 text-sm text-white shadow-lg dark:bg-neutral-100 dark:text-neutral-900">
        <span>新しいバージョンがあります</span>
        <button
          type="button"
          className="font-semibold text-blue-300 dark:text-blue-600"
          onClick={() => updateServiceWorker(true)}
        >
          更新する
        </button>
        <button
          type="button"
          className="text-neutral-400"
          onClick={() => setNeedRefresh(false)}
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
