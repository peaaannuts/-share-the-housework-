import { useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useHousehold } from '../contexts/HouseholdContext'
import { CategoryPie } from './dashboard/CategoryPie'
import { ChoreBreakdown } from './dashboard/ChoreBreakdown'
import { SplitRatioBar } from './dashboard/SplitRatioBar'
import { TargetRatioEditor } from './dashboard/TargetRatioEditor'
import { WeeklyTrend } from './dashboard/WeeklyTrend'
import { useAllLogs, useLogsInRange } from '../hooks/useLogs'
import { formatShortDate, getPeriodRange, getRecentWeeks, type Period } from '../lib/date'
import { useIsDark } from '../lib/theme'
import { CHORE_CATEGORIES, type ChoreCategory } from '../types'

export function DashboardTab() {
  const { user } = useAuth()
  const { household, myNickname, partnerUid, setTargetRatio } = useHousehold()
  const isDark = useIsDark()
  const [period, setPeriod] = useState<Period>('week')

  const { start, end } = useMemo(() => getPeriodRange(period), [period])
  const { logs } = useLogsInRange(household?.id ?? null, start, end)

  const recentWeeks = useMemo(() => getRecentWeeks(6), [])
  const { logs: trendLogs } = useLogsInRange(
    household?.id ?? null,
    recentWeeks[0].start,
    recentWeeks[recentWeeks.length - 1].end,
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
    <div className="min-h-full px-4 pb-28 pt-6">
      <h1 className="mb-4 text-2xl font-bold text-neutral-900 dark:text-white">
        📊 ダッシュボード
      </h1>

      <div className="mb-4 flex gap-2">
        {(['week', 'month'] as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              period === p
                ? 'bg-blue-600 text-white'
                : 'bg-white text-neutral-500 ring-1 ring-neutral-200 dark:bg-neutral-900 dark:text-neutral-400 dark:ring-neutral-800'
            }`}
          >
            {p === 'week' ? '今週' : '今月'}
          </button>
        ))}
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
