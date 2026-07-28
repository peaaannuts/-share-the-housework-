import { EmailAuthProvider, linkWithCredential, type User } from 'firebase/auth'
import { useState } from 'react'

export function AccountCard({ user }: { user: User }) {
  const alreadyLinked = user.providerData.some((p) => p.providerId === 'password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleLink() {
    setError(null)
    if (!email || password.length < 6) {
      setError('メールアドレスと6文字以上のパスワードを入力してください')
      return
    }
    setStatus('saving')
    try {
      const credential = EmailAuthProvider.credential(email, password)
      await linkWithCredential(user, credential)
      setStatus('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : '連携に失敗しました')
      setStatus('idle')
    }
  }

  return (
    <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
      <h3 className="mb-1 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
        アカウント
      </h3>
      {alreadyLinked || status === 'done' ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          メールアドレスと連携済みです。機種変更時もこのメールでログインし直せます。
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-neutral-400">
            メールを連携すると、機種変更時もデータを引き継げます（任意）
          </p>
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
          <input
            type="password"
            placeholder="パスワード（6文字以上）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="button"
            onClick={handleLink}
            disabled={status === 'saving'}
            className="rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white disabled:opacity-50 active:bg-blue-700"
          >
            {status === 'saving' ? '連携中...' : '連携する'}
          </button>
        </div>
      )}
    </div>
  )
}
