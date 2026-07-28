import { useState } from 'react'
import { useHousehold } from '../contexts/HouseholdContext'

type Mode = 'choose' | 'create' | 'join'

export function OnboardingScreen() {
  const { create, join } = useHousehold()
  const [mode, setMode] = useState<Mode>('choose')
  const [nickname, setNickname] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleCreate() {
    if (!nickname.trim()) {
      setError('名前を入力してください')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await create(nickname.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : '作成に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleJoin() {
    if (!nickname.trim()) {
      setError('名前を入力してください')
      return
    }
    if (!code.trim()) {
      setError('招待コードを入力してください')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await join(code.trim(), nickname.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : '参加に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-500 text-4xl shadow-lg shadow-blue-500/25">
          🏠
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">家事分担アプリ</h1>
        <p className="mt-2 max-w-xs text-sm text-neutral-500 dark:text-neutral-400">
          2人の家事の量を記録して、フェアな話し合いの材料にしよう
        </p>
      </div>

      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:ring-white/10">
        {mode === 'choose' && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setMode('create')}
              className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 px-4 py-3.5 font-semibold text-white shadow-md shadow-blue-500/20 active:opacity-90"
            >
              世帯を新規作成する
            </button>
            <button
              type="button"
              onClick={() => setMode('join')}
              className="rounded-2xl border border-neutral-300 px-4 py-3.5 font-semibold text-neutral-700 active:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:active:bg-neutral-800"
            >
              招待コードで参加する
            </button>
          </div>
        )}

        {mode !== 'choose' && (
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => {
                setMode('choose')
                setError(null)
              }}
              className="self-start text-sm text-neutral-400"
            >
              ← 戻る
            </button>

            <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-300">
              あなたの呼び名
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="例: たろう"
                className="rounded-lg border border-neutral-300 px-3 py-2 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </label>

            {mode === 'join' && (
              <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-300">
                招待コード
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="例: AB12CD"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-base uppercase tracking-widest text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                />
              </label>
            )}

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <button
              type="button"
              disabled={submitting}
              onClick={mode === 'create' ? handleCreate : handleJoin}
              className="rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 px-4 py-3.5 font-semibold text-white shadow-md shadow-blue-500/20 disabled:opacity-50 active:opacity-90"
            >
              {submitting ? '処理中...' : mode === 'create' ? '世帯を作成する' : '参加する'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
