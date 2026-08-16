import { useMemo } from 'react'
import { memberColor } from '../../lib/chartColors'
import { buildChoreStats } from '../../lib/choreStats'
import { formatShortDate, getWeekRange } from '../../lib/date'
import type { ChoreLog } from '../../types'

interface Props {
  logs: ChoreLog[]
  selfUid: string
  selfLabel: string
  partnerLabel: string
  isDark: boolean
  weekStart: Date
  weekEnd: Date
  onPrevWeek: () => void
  onNextWeek: () => void
}

/**
 * 「分担比率」の下に置く、週単位の家事別実施状況。ChoreBreakdown（全期間
 * 累計）と同じ行レイアウト・集計ロジック（buildChoreStats）を使うが、
 * 対象ログを呼び出し側で選択中の週に絞ってもらう点だけが違う。
 * 見出し行の‹/›で前週・翌週に移動できる（月セレクタの矢印ボタンと同系統）。
 */
export function WeeklyBreakdown({
  logs,
  selfUid,
  selfLabel,
  partnerLabel,
  isDark,
  weekStart,
  weekEnd,
  onPrevWeek,
  onNextWeek,
}: Props) {
  const rows = useMemo(() => buildChoreStats(logs, selfUid), [logs, selfUid])
  const selfColor = memberColor(true, isDark)
  const partnerColor = memberColor(false, isDark)
  const lastDay = new Date(weekEnd.getTime() - 86_400_000)
  // 前週・翌週に移動すると「今週」ではなくなるので、見出し・空メッセージの
  // 文言を選択中の週が実際の今週かどうかで出し分ける。
  const isThisWeek = weekStart.getTime() === getWeekRange(new Date()).start.getTime()

  return (
    <div className="mt-3 rounded-[28px] border-4 border-white bg-[#fffdf5] p-[18px] shadow-[0_6px_0_rgba(120,140,90,0.28)] dark:border-neutral-700 dark:bg-neutral-900">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="text-[13.5px] font-bold text-[#8a9470] dark:text-neutral-400">
          {isThisWeek ? '今週の実施状況' : '週の実施状況'}
        </h3>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onPrevWeek}
            aria-label="前週"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base font-bold text-[#8a9470] active:bg-[#eef2e2] dark:text-neutral-400 dark:active:bg-neutral-800"
          >
            ‹
          </button>
          <span className="min-w-[86px] text-center text-[11px] font-bold text-[#4e4133] dark:text-white">
            {formatShortDate(weekStart)}〜{formatShortDate(lastDay)}
          </span>
          <button
            type="button"
            onClick={onNextWeek}
            aria-label="翌週"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base font-bold text-[#8a9470] active:bg-[#eef2e2] dark:text-neutral-400 dark:active:bg-neutral-800"
          >
            ›
          </button>
        </div>
      </div>
      <p className="mb-3 text-xs text-[#a8ad92] dark:text-neutral-500">家事ごとの実施回数と時間</p>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#a8ad92] dark:text-neutral-500">
          {isThisWeek ? '今週はまだ記録がありません' : 'この週の記録はありません'}
        </p>
      ) : (
        <>
          <div className="mb-1 flex items-center justify-end gap-4 text-xs text-[#a8ad92] dark:text-neutral-500">
            <span className="flex w-16 items-center justify-end gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: selfColor }}
              />
              {selfLabel || 'あなた'}
            </span>
            <span className="flex w-16 items-center justify-end gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: partnerColor }}
              />
              {partnerLabel}
            </span>
          </div>
          <div className="flex flex-col divide-y divide-[#f0ede4] dark:divide-neutral-800">
            {rows.map((row) => (
              <div key={row.choreId} className="flex items-center justify-between gap-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#4e4133] dark:text-white">
                    {row.choreName}
                  </p>
                  <p className="text-xs text-[#a8ad92] dark:text-neutral-500">{row.category}</p>
                </div>
                <div className="flex shrink-0 gap-4 text-right text-sm">
                  <div className="w-16">
                    <p className="font-bold text-[#4e4133] dark:text-neutral-200">
                      {row.selfCount}回
                    </p>
                    <p className="text-xs text-[#a8ad92] dark:text-neutral-500">
                      {row.selfMinutes}分
                    </p>
                  </div>
                  <div className="w-16">
                    <p className="font-bold text-[#4e4133] dark:text-neutral-200">
                      {row.partnerCount}回
                    </p>
                    <p className="text-xs text-[#a8ad92] dark:text-neutral-500">
                      {row.partnerMinutes}分
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
