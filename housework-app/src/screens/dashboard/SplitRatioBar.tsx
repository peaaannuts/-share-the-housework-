import { memberColor } from '../../lib/chartColors'

interface Props {
  selfPct: number
  partnerPct: number
  selfLabel: string
  partnerLabel: string
  isDark: boolean
}

export function SplitRatioBar({ selfPct, partnerPct, selfLabel, partnerLabel, isDark }: Props) {
  const selfColor = memberColor(true, isDark)
  const partnerColor = memberColor(false, isDark)

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
      <h3 className="mb-3 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
        分担比率
      </h3>
      <div className="flex h-6 gap-[2px] overflow-hidden rounded-full">
        <div
          className="flex items-center justify-center text-xs font-semibold text-white"
          style={{ width: `${selfPct}%`, backgroundColor: selfColor }}
        >
          {selfPct >= 12 ? `${selfPct}%` : ''}
        </div>
        <div
          className="flex items-center justify-center text-xs font-semibold text-white"
          style={{ width: `${partnerPct}%`, backgroundColor: partnerColor }}
        >
          {partnerPct >= 12 ? `${partnerPct}%` : ''}
        </div>
      </div>
      <div className="mt-3 flex justify-between text-sm">
        <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-200">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: selfColor }}
          />
          {selfLabel || 'あなた'} {selfPct}%
        </span>
        <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-200">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: partnerColor }}
          />
          {partnerLabel} {partnerPct}%
        </span>
      </div>
    </div>
  )
}
