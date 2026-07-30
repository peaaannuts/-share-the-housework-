import { useEffect, useMemo, useState } from 'react'
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
import { CHORE_CATEGORIES } from '../../types'

export const SPIN_COST = 500
// Floor on how long the spin animation runs, regardless of how fast the
// transaction resolves — keeps the reel from flashing by in a single frame.
const MIN_SPIN_MS = 900
const CONFETTI_EMOJI = ['🍀', '✨', '🌿', '⭐️']

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

function SpinOverlay({ emoji }: { emoji: string }) {
  return (
    <div className="fixed inset-0 z-[65] flex flex-col items-center justify-center gap-4 bg-black/35 backdrop-blur-[1px]">
      <div
        className="flex h-28 w-28 items-center justify-center rounded-full border-[6px] border-white text-5xl shadow-[0_8px_0_rgba(180,130,40,0.45)]"
        style={{
          background: 'linear-gradient(180deg,#ffd166,#f3b23f)',
          animation: 'capsuleShake 0.5s ease-in-out infinite',
        }}
      >
        {emoji}
      </div>
      <p className="text-sm font-bold text-white drop-shadow">ドキドキ…</p>
    </div>
  )
}

function Confetti() {
  const particles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const angle = (i / 14) * 2 * Math.PI + (Math.random() - 0.5) * 0.4
        const distance = 70 + Math.random() * 70
        return {
          id: i,
          emoji: CONFETTI_EMOJI[i % CONFETTI_EMOJI.length],
          tx: Math.cos(angle) * distance,
          ty: Math.sin(angle) * distance - 20,
          rot: (Math.random() - 0.5) * 480,
          delay: Math.random() * 0.1,
          duration: 0.8 + Math.random() * 0.4,
        }
      }),
    [],
  )
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute left-1/2 top-1/3 text-xl"
          style={
            {
              '--tx': `${p.tx}px`,
              '--ty': `${p.ty}px`,
              '--rot': `${p.rot}deg`,
              animation: `confettiBurst ${p.duration}s ease-out ${p.delay}s forwards`,
            } as React.CSSProperties
          }
        >
          {p.emoji}
        </span>
      ))}
    </div>
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
    <div className="sheet-overlay z-[60] flex items-end bg-black/40" onClick={onClose}>
      <div
        className="sheet-panel max-h-[80dvh] w-full rounded-t-3xl bg-[#fffdf5] p-5 dark:bg-neutral-900"
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
  const [reelTick, setReelTick] = useState(0)
  const [burst, setBurst] = useState(0)

  useEffect(() => {
    if (!spinning) return
    const id = setInterval(() => setReelTick((t) => t + 1), 90)
    return () => clearInterval(id)
  }, [spinning])
  const reelEmoji = categoryEmoji(CHORE_CATEGORIES[reelTick % CHORE_CATEGORIES.length])

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
      const start = performance.now()
      const wonId = await spendAndUnlock(
        household.id,
        shuffled(HOUSEWORK_TIPS.map((t) => t.id)),
        SPIN_COST,
        earned,
      )
      // Let the reel spin for at least MIN_SPIN_MS regardless of how fast
      // the transaction resolved, so the draw always reads as a draw.
      const elapsed = performance.now() - start
      if (elapsed < MIN_SPIN_MS) await new Promise((r) => setTimeout(r, MIN_SPIN_MS - elapsed))
      setJustWon(HOUSEWORK_TIPS.find((t) => t.id === wonId) ?? null)
      setBurst((b) => b + 1)
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
          <div className="relative mt-4 animate-[popIn_0.4s_cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden rounded-[28px] border-4 border-[#ffd166] bg-[#fffdf5] p-5 shadow-[0_6px_0_rgba(180,130,40,0.35)] dark:bg-neutral-900">
            <Confetti key={burst} />
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
      {spinning && <SpinOverlay emoji={reelEmoji} />}
    </div>
  )
}
