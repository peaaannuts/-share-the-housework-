import { useRef, useState } from 'react'
import { categoryChipColor, categoryEmoji } from '../../lib/categoryStyle'
import { hoursAgo, toLocalInputValue, todayAt, yesterdayAt } from '../../lib/date'
import { useIsDark } from '../../lib/theme'
import type { Chore } from '../../types'

interface Preset {
  label: string
  sublabel: string
  at: () => number
}

const PRESETS: Preset[] = [
  { label: '今', sublabel: 'たった今', at: () => Date.now() },
  { label: 'さっき', sublabel: '1時間前', at: () => hoursAgo(1) },
  { label: '今朝', sublabel: '8:00', at: () => todayAt(8) },
  { label: '昨日の夜', sublabel: '昨日 20:00', at: () => yesterdayAt(20) },
]

export function QuickTimeSheet({
  chore,
  onPick,
  onClose,
}: {
  chore: Chore
  onPick: (doneAt: number, minutes: number) => void
  onClose: () => void
}) {
  const isDark = useIsDark()
  // The backdrop closes only when the press *started* on it. This sheet is
  // opened by a long-press on a row underneath, so lifting the finger fires a
  // click straight onto the freshly mounted backdrop — without this guard the
  // sheet would open and close again in the same gesture (looked on iPhone
  // like the long-press did nothing at all).
  const pressStartedOnBackdrop = useRef(false)
  const [showCustom, setShowCustom] = useState(false)
  const [customValue, setCustomValue] = useState(() => toLocalInputValue(Date.now()))
  // Seeded with the chore's standard duration; whichever time the user then
  // picks (preset or custom), this is the duration that gets recorded.
  const [minutes, setMinutes] = useState(String(chore.minutes))

  const minutesNum = Number(minutes)
  const minutesValid = minutes.trim() !== '' && Number.isFinite(minutesNum) && minutesNum > 0

  return (
    <div
      className="sheet-overlay z-50 flex items-end bg-black/40"
      onPointerDown={(e) => {
        pressStartedOnBackdrop.current = e.target === e.currentTarget
      }}
      onClick={() => {
        if (pressStartedOnBackdrop.current) onClose()
      }}
    >
      <div
        className="sheet-panel max-h-[85dvh] w-full rounded-t-3xl bg-white p-4 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-neutral-200 dark:bg-neutral-700" />

        <div className="mb-4 flex items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl"
            style={{ backgroundColor: categoryChipColor(chore.category, isDark) }}
          >
            {categoryEmoji(chore.category)}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-neutral-900 dark:text-white">
              {chore.name}
            </h3>
            <p className="text-xs text-neutral-400">いつ・何分やりましたか？</p>
          </div>
        </div>

        <div className="mb-4">
          <label className="flex items-center justify-between gap-3 rounded-2xl bg-neutral-50 px-4 py-3 dark:bg-neutral-800">
            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
              かかった時間
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="w-20 rounded-lg border border-neutral-300 px-2.5 py-1.5 text-right text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              />
              <span className="text-sm text-neutral-500 dark:text-neutral-400">分</span>
            </span>
          </label>
          {!minutesValid && (
            <p className="mt-1.5 px-1 text-xs text-red-500">1以上の数字を入れてください</p>
          )}
        </div>

        {!showCustom ? (
          <div className="flex flex-col gap-2">
            <p className="px-1 text-xs font-medium text-neutral-400">やった時刻</p>
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                disabled={!minutesValid}
                onClick={() => onPick(preset.at(), minutesNum)}
                className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3.5 text-left active:bg-neutral-100 disabled:opacity-40 dark:bg-neutral-800 dark:active:bg-neutral-700"
              >
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {preset.label}
                </span>
                <span className="text-sm text-neutral-400">{preset.sublabel}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowCustom(true)}
              className="flex items-center justify-between rounded-2xl border border-dashed border-neutral-300 px-4 py-3.5 text-left text-neutral-500 active:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:active:bg-neutral-800"
            >
              <span className="font-medium">日時を指定…</span>
              <span>›</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-300">
              日時
              <input
                type="datetime-local"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCustom(false)}
                className="flex-1 rounded-xl border border-neutral-300 py-3 font-medium text-neutral-600 active:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:active:bg-neutral-800"
              >
                戻る
              </button>
              <button
                type="button"
                disabled={!minutesValid}
                onClick={() => {
                  const ms = new Date(customValue).getTime()
                  if (!Number.isNaN(ms) && minutesValid) onPick(ms, minutesNum)
                }}
                className="flex-1 rounded-xl bg-[#c2683f] py-3 font-semibold text-white disabled:opacity-50 active:bg-[#a4542f]"
              >
                この時刻で記録
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
