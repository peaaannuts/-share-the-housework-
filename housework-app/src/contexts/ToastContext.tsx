import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

interface ToastState {
  id: number
  message: string
  onUndo?: () => void
}

interface ToastContextValue {
  show: (message: string, onUndo?: () => void) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)
const DISMISS_MS = 4000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback((message: string, onUndo?: () => void) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const id = Date.now()
    setToast({ id, message, onUndo })
    timerRef.current = setTimeout(() => {
      setToast((cur) => (cur?.id === id ? null : cur))
    }, DISMISS_MS)
  }, [])

  function dismiss() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast(null)
  }

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <div className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full bg-neutral-900 px-5 py-3 text-sm text-white shadow-lg dark:bg-neutral-100 dark:text-neutral-900">
            <span>{toast.message}</span>
            {toast.onUndo && (
              <button
                type="button"
                className="font-semibold text-blue-300 dark:text-blue-600"
                onClick={() => {
                  toast.onUndo?.()
                  dismiss()
                }}
              >
                取り消す
              </button>
            )}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
