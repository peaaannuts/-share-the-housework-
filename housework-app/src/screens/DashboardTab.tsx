import { useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useHousehold } from '../contexts/HouseholdContext'
import { useSwipe } from '../hooks/useSwipe'
import { CategoryPie } from './dashboard/CategoryPie'
import { ChoreBreakdown } from './dashboard/ChoreBreakdown'
import { SplitRatioBar } from './dashboard/SplitRatioBar'
import { TargetRatioEditor } from './dashboard/TargetRatioEditor'
import { WeeklyBreakdown } from './dashboard/WeeklyBreakdown'
import { WeeklyTrend } from './dashboard/WeeklyTrend'
import { useAllLogs, useLogsInRange } from '../hooks/useLogs'
import {
  addMonths,
  addWeeks,
  formatMonthRange,
  formatShortDate,
  formatYearMonth,
  getMonthRange,
  getRecentWeeks,
  getWeekRange,
  startOfMonth,
} from '../lib/date'
import { useIsDark } from '../lib/theme'
import { CHORE_CATEGORIES, type ChoreCategory } from '../types'

export function DashboardTab() {
  const { user } = useAuth()
  const { household, myNickname, partnerUid, setTargetRatio } = useHousehold()
  const isDark = useIsDark()

  // マネーフォワード風: 週/月切替ではなく「選択中の月」を1つ持つ。初期表示は当月。
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()))
  // 左スワイプ=前月、右スワイプ=次月（指定どおり）。TargetRatioEditor の
  // スライダーは横ドラッグそのものなので、スワイプ判定は月ヘッダーの
  // カードだけに絞り、他の操作と衝突しないようにする。
  const swipe = useSwipe(
    () => setSelectedMonth((m) => addMonths(m, -1)),
    () => setSelectedMonth((m) => addMonths(m, 1)),
  )

  const { start, end } = useMemo(() => getMonthRange(selectedMonth), [selectedMonth])
  const { logs } = useLogsInRange(household?.id ?? null, start, end)

  const recentWeeks = useMemo(() => getRecentWeeks(6), [])
  const { logs: trendLogs } = useLogsInRange(
    household?.id ?? null,
    recentWeeks[0].start,
    recentWeeks[recentWeeks.length - 1].end,
  )

  // 「今週の実施状況」は前週・翌週にタップで移動できる——WeeklyTrendの
  // 直近6週間ウィンドウには縛られたくない（もっと過去にも遡れるように）
  // ので、trendLogsのfilterではなく独立したクエリで取得する。
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const selectedWeek = useMemo(() => getWeekRange(weekAnchor), [weekAnchor])
  const { logs: selectedWeekLogs } = useLogsInRange(
    household?.id ?? null,
    selectedWeek.start,
    selectedWeek.end,
  )

  const { logs: allLogs } = useAllLogs(household?.id ?? null)

  if (!household || !user) return null

  const partnerNickname = partnerUid ? household.nicknames?.[partnerUid] : null

  const selfScore = logs.filter((l) => l.userId === user.uid).reduce((s, l) => s + l.score, 0)
  const partnerScore = partnerUid
    ? logs.filter((l) => l.userId === partnerUid).reduce((s, l) => s + l.score, 0)
    : 0
  const total = selfScore + partnerScore
  const selfPct = total > 0 ? Math.round((selfScore / total) * 100) : 50
  const partnerPct = 100 - selfPct

  const targetSelf = household.targetRatio?.[user.uid] ?? 50

  const categoryTotals = CHORE_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = logs.filter((l) => l.category === cat).reduce((s, l) => s + l.score, 0)
      return acc
    },
    {} as Record<ChoreCategory, number>,
  )

  const weeklyData = recentWeeks.map((w) => {
    const weekLogs = trendLogs.filter(
      (l) => l.doneAt >= w.start.getTime() && l.doneAt < w.end.getTime(),
    )
    return {
      label: formatShortDate(w.start),
      self: weekLogs.filter((l) => l.userId === user.uid).reduce((s, l) => s + l.score, 0),
      partner: partnerUid
        ? weekLogs.filter((l) => l.userId === partnerUid).reduce((s, l) => s + l.score, 0)
        : 0,
    }
  })

  return (
    <div className="min-h-full px-4 pb-28 pt-6 font-['Zen_Maru_Gothic']">
      <h1 className="mb-4 text-2xl font-bold text-neutral-900 dark:text-white">
        📊 ダッシュボード
      </h1>

      <div
        onPointerDown={swipe.onPointerDown}
        onPointerUp={swipe.onPointerUp}
        onPointerCancel={swipe.onPointerCancel}
        // select-none + touch-action:pan-y — without these, a real horizontal
        // swipe on iOS can pop up the native text-selection UI (the month
        // label is just text) or get intercepted by the browser's own pan
        // gesture before our pointerup ever fires. pan-y still lets a swipe
        // that starts here fall through to normal page scrolling if it turns
        // out to be vertical.
        className="mb-4 flex select-none items-center justify-center gap-4 rounded-[24px] border-4 border-white bg-[#fffdf5] px-3 py-3 shadow-[0_5px_0_rgba(120,140,90,0.22)] [touch-action:pan-y] dark:border-neutral-700 dark:bg-neutral-900"
      >
        <button
          type="button"
          onClick={() => setSelectedMonth((m) => addMonths(m, -1))}
          aria-label="前月"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl font-bold text-[#8a9470] active:bg-[#eef2e2] dark:text-neutral-400 dark:active:bg-neutral-800"
        >
          ‹
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[16px] font-bold text-[#4e4133] dark:text-white">
            {formatYearMonth(selectedMonth)}
          </span>
          <span className="text-[11px] text-[#a8ad92] dark:text-neutral-500">
            {formatMonthRange(selectedMonth)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setSelectedMonth((m) => addMonths(m, 1))}
          aria-label="次月"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl font-bold text-[#8a9470] active:bg-[#eef2e2] dark:text-neutral-400 dark:active:bg-neutral-800"
        >
          ›
        </button>
      </div>

      {!partnerUid && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          パートナーがまだ参加していません。設定画面から招待コードを共有しましょう。
        </p>
      )}

      <SplitRatioBar
        selfPct={selfPct}
        partnerPct={partnerPct}
        selfLabel={myNickname}
        partnerLabel={partnerNickname ?? 'パートナー'}
        isDark={isDark}
      />

      <WeeklyBreakdown
        logs={selectedWeekLogs}
        selfUid={user.uid}
        selfLabel={myNickname}
        partnerLabel={partnerNickname ?? 'パートナー'}
        isDark={isDark}
        weekStart={selectedWeek.start}
        weekEnd={selectedWeek.end}
        onPrevWeek={() => setWeekAnchor((w) => addWeeks(w, -1))}
        onNextWeek={() => setWeekAnchor((w) => addWeeks(w, 1))}
      />

      <TargetRatioEditor
        target={targetSelf}
        selfLabel={myNickname}
        partnerLabel={partnerNickname ?? 'パートナー'}
        onChange={(v) => setTargetRatio(user.uid, v)}
      />

      <CategoryPie totals={categoryTotals} isDark={isDark} />

      <WeeklyTrend
        data={weeklyData}
        selfLabel={myNickname}
        partnerLabel={partnerNickname ?? 'パートナー'}
        isDark={isDark}
      />

      <ChoreBreakdown
        logs={allLogs}
        selfUid={user.uid}
        selfLabel={myNickname}
        partnerLabel={partnerNickname ?? 'パートナー'}
        isDark={isDark}
      />
    </div>
  )
}
