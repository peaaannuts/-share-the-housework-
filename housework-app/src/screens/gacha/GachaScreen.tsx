import { useMemo, useState } from 'react'
import { useHousehold } from '../../contexts/HouseholdContext'
import { useAllLogs } from '../../hooks/useLogs'
import { HOUSEWORK_TIPS, type HouseworkTip } from '../../data/houseworkTips'
import { categoryChipColor, categoryEmoji } from '../../lib/categoryStyle'
import {
  AllTipsUnlockedError,
  NotEnoughCloversError,
  spendAndUnlock,
} from '../../lib/gachaService'
import { useIsDark } from '../../lib/theme'

export const SPIN_COST = 500

function shuffled<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function TipArt({ tip, isDark, size }: { tip: HouseworkTip; isDark: boolean; size: 'sm' | 'lg' }) {
  const box =
    size === 'lg'
      ? 'h-32 w-full rounded-[18px] text-5xl'
      : 'h-14 w-14 shrink-0 rounded-2xl text-2xl'
  return (
    <span
      className={`flex items-center justify-center overflow-hidden border-2 border-white/90 dark:border-neutral-800 ${box}`}
      style={{ backgroundColor: categoryChipColor(tip.category, isDark) }}
    >
      {tip.image ? (
        <img
          src={tip.image}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      ) : (
        categoryEmoji(tip.category)
      )}
    </span>
  )
}

function TipDetailSheet({
  tip,
  isDark,
  onClose,
}: {
  tip: HouseworkTip
  isDark: boolean
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-black/40" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full overflow-y-auto rounded-t-3xl bg-[#fffdf5] p-5 pb-8 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-neutral-200 dark:bg-neutral-700" />
        <TipArt tip={tip} isDark={isDark} size="lg" />
        <p className="mt-3 text-[11px] font-bold text-[#8a9470] dark:text-neutral-400">
          {categoryEmoji(tip.category)} {tip.category}
        </p>
        <h3 className="mt-1 text-lg font-bold text-[#4e4133] dark:text-white">{tip.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[#6b5a49] dark:text-neutral-300">
          {tip.body}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-2xl border-[3px] border-white bg-[#eef2e2] py-3 font-bold text-[#4e5c35] active:translate-y-0.5 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
        >
          閉じる
        </button>
      </div>
    </div>
  )
}

export function GachaScreen({ onClose }: { onClose: () => void }) {
  const { household } = useHousehold()
  const isDark = useIsDark()
  // Only mounted with this screen, so the all-logs read never runs at startup.
  const { logs, loading } = useAllLogs(household?.id ?? null)

  const [spinning, setSpinning] = useState(false)
  const [justWon, setJustWon] = useState<HouseworkTip | null>(null)
  const [viewing, setViewing] = useState<HouseworkTip | null>(null)
  const [error, setError] = useState<string | null>(null)

  const unlockedIds = useMemo(() => household?.tipsUnlocked ?? [], [household?.tipsUnlocked])
  const earned = useMemo(() => logs.reduce((sum, l) => sum + l.minutes * 10, 0), [logs])
  const balance = earned - (household?.cloversSpent ?? 0)
  // Undoing records after a spin can drive the true balance below zero. Floor
  // it for display so the counter never reads as negative currency; the spin
  // gate and the shortfall hint still use the real value, so it stays honest
  // about how much more is needed.
  const displayBalance = Math.max(0, balance)

  const unlockedCount = HOUSEWORK_TIPS.filter((t) => unlockedIds.includes(t.id)).length
  const complete = unlockedCount >= HOUSEWORK_TIPS.length
  const canSpin = !loading && !spinning && !complete && balance >= SPIN_COST

  async function handleSpin() {
    if (!household || !canSpin) return
    setError(null)
    setSpinning(true)
    setJustWon(null)
    try {
      const wonId = await spendAndUnlock(
        household.id,
        shuffled(HOUSEWORK_TIPS.map((t) => t.id)),
        SPIN_COST,
        earned,
      )
      // Small pause so the button's spinning state reads as a draw.
      await new Promise((r) => setTimeout(r, 600))
      setJustWon(HOUSEWORK_TIPS.find((t) => t.id === wonId) ?? null)
    } catch (e) {
      if (e instanceof NotEnoughCloversError) setError('クローバーが足りませんでした。')
      else if (e instanceof AllTipsUnlockedError) setError('すべて開放済みです。')
      else {
        setError('うまくいきませんでした。もう一度おためしください。')
        console.error('gacha spin failed', e)
      }
    } finally {
      setSpinning(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-b from-[#bfe4f0] via-[#dff0dc] to-[#cfe6b8] px-4 pb-10 pt-6 font-['Zen_Maru_Gothic'] dark:from-[#10202a] dark:via-[#142a20] dark:to-[#16241a]">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold text-[#4e5c35] dark:text-neutral-100">家事のTIPS</h1>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border-[3px] border-white bg-[#fffdf5] px-4 py-2 text-sm font-bold text-[#6b5a49] shadow-[0_3px_0_rgba(120,140,90,0.25)] active:translate-y-0.5 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
          >
            閉じる
          </button>
        </div>

        <div className="mt-4 rounded-[28px] border-4 border-white bg-[#fffdf5] p-5 text-center shadow-[0_6px_0_rgba(120,140,90,0.28)] dark:border-neutral-700 dark:bg-neutral-900">
          <p className="text-xs font-bold text-[#8a9470] dark:text-neutral-400">つかえるクローバー</p>
          <p className="mt-1 text-3xl font-bold text-[#5d7a3a] dark:text-[#a3d17a]">
            🍀 {loading ? '…' : displayBalance.toLocaleString('ja-JP')}
          </p>
          <p className="mt-1 text-xs text-[#a8ad92] dark:text-neutral-500">
            あつめた TIPS {unlockedCount} / {HOUSEWORK_TIPS.length}
          </p>

          <button
            type="button"
            disabled={!canSpin}
            onClick={handleSpin}
            className="mt-4 w-full rounded-full border-[3px] border-white py-3.5 text-[15px] font-bold text-[#6b4a17] shadow-[0_5px_0_rgba(180,130,40,0.45)] transition active:translate-y-[3px] active:shadow-[0_2px_0_rgba(180,130,40,0.45)] disabled:opacity-40 dark:border-neutral-800"
            style={{ background: 'linear-gradient(180deg,#ffd166,#f3b23f)' }}
          >
            {complete
              ? 'コンプリート！'
              : spinning
                ? 'まわしています…'
                : `🍀${SPIN_COST} でまわす`}
          </button>

          {!complete && !loading && balance < SPIN_COST && (
            <p className="mt-2 text-xs text-[#a8ad92] dark:text-neutral-500">
              あと 🍀{(SPIN_COST - balance).toLocaleString('ja-JP')} でまわせます
            </p>
          )}
          {complete && (
            <p className="mt-2 text-xs text-[#a8ad92] dark:text-neutral-500">
              ぜんぶ集まりました。おつかれさま。
            </p>
          )}
          {error && <p className="mt-2 text-xs font-bold text-red-500">{error}</p>}
        </div>

        {justWon && (
          <div className="mt-4 animate-[fadeIn_0.3s_ease-out] rounded-[28px] border-4 border-[#ffd166] bg-[#fffdf5] p-5 shadow-[0_6px_0_rgba(180,130,40,0.35)] dark:bg-neutral-900">
            <p className="text-center text-xs font-bold text-[#c08d55]">あたらしいTIPS</p>
            <div className="mt-3">
              <TipArt tip={justWon} isDark={isDark} size="lg" />
            </div>
            <h3 className="mt-3 text-center text-lg font-bold text-[#4e4133] dark:text-white">
              {justWon.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#6b5a49] dark:text-neutral-300">
              {justWon.body}
            </p>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2.5">
          {HOUSEWORK_TIPS.map((tip) => {
            const unlocked = unlockedIds.includes(tip.id)
            if (!unlocked) {
              return (
                <div
                  key={tip.id}
                  className="flex items-center gap-3 rounded-[24px] border-4 border-white/70 bg-[#fffdf5]/50 px-3 py-3 dark:border-neutral-800 dark:bg-neutral-900/50"
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#e4ecd6] text-2xl text-[#b3bfa0] dark:bg-neutral-800 dark:text-neutral-600">
                    ？
                  </span>
                  <span className="text-sm font-bold text-[#b3bfa0] dark:text-neutral-600">
                    まだ開放されていません
                  </span>
                </div>
              )
            }
            return (
              <button
                key={tip.id}
                type="button"
                onClick={() => setViewing(tip)}
                className="flex items-center gap-3 rounded-[24px] border-4 border-white bg-[#fffdf5] px-3 py-3 text-left shadow-[0_5px_0_rgba(120,140,90,0.22)] transition active:translate-y-0.5 dark:border-neutral-700 dark:bg-neutral-900"
              >
                <TipArt tip={tip} isDark={isDark} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-bold text-[#8a9470] dark:text-neutral-400">
                    {tip.category}
                  </span>
                  <span className="block font-bold text-[#4e4133] dark:text-white">
                    {tip.title}
                  </span>
                </span>
                <span className="shrink-0 text-[#c3ab94]">›</span>
              </button>
            )
          })}
        </div>
      </div>

      {viewing && <TipDetailSheet tip={viewing} isDark={isDark} onClose={() => setViewing(null)} />}
    </div>
  )
}
