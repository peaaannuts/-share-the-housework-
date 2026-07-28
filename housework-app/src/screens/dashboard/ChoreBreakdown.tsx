import { useMemo } from 'react'
import { memberColor } from '../../lib/chartColors'
import type { ChoreLog } from '../../types'

interface ChoreStat {
  choreId: string
  choreName: string
  category: string
  selfCount: number
  selfMinutes: number
  partnerCount: number
  partnerMinutes: number
}

interface Props {
  logs: ChoreLog[]
  selfUid: string
  selfLabel: string
  partnerLabel: string
  isDark: boolean
}

export function ChoreBreakdown({ logs, selfUid, selfLabel, partnerLabel, isDark }: Props) {
  const rows = useMemo(() => {
    const byChore = new Map<string, ChoreStat>()
    for (const log of logs) {
      let stat = byChore.get(log.choreId)
      if (!stat) {
        stat = {
          choreId: log.choreId,
          choreName: log.choreName,
          category: log.category,
          selfCount: 0,
          selfMinutes: 0,
          partnerCount: 0,
          partnerMinutes: 0,
        }
        byChore.set(log.choreId, stat)
      }
      if (log.userId === selfUid) {
        stat.selfCount += 1
        stat.selfMinutes += log.minutes
      } else {
        stat.partnerCount += 1
        stat.partnerMinutes += log.minutes
      }
    }
    return Array.from(byChore.values()).sort(
      (a, b) => b.selfMinutes + b.partnerMinutes - (a.selfMinutes + a.partnerMinutes),
    )
  }, [logs, selfUid])

  const selfColor = memberColor(true, isDark)
  const partnerColor = memberColor(false, isDark)

  return (
    <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
      <h3 className="mb-1 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
        家事別実績（累計）
      </h3>
      <p className="mb-3 text-xs text-neutral-400">これまでの記録の、家事ごとの実施回数と時間</p>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-400">まだ記録がありません</p>
      ) : (
        <>
          <div className="mb-1 flex items-center justify-end gap-4 text-xs text-neutral-400">
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
          <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {rows.map((row) => (
              <div key={row.choreId} className="flex items-center justify-between gap-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">
                    {row.choreName}
                  </p>
                  <p className="text-xs text-neutral-400">{row.category}</p>
                </div>
                <div className="flex shrink-0 gap-4 text-right text-sm">
                  <div className="w-16">
                    <p className="font-medium text-neutral-700 dark:text-neutral-200">
                      {row.selfCount}回
                    </p>
                    <p className="text-xs text-neutral-400">{row.selfMinutes}分</p>
                  </div>
                  <div className="w-16">
                    <p className="font-medium text-neutral-700 dark:text-neutral-200">
                      {row.partnerCount}回
                    </p>
                    <p className="text-xs text-neutral-400">{row.partnerMinutes}分</p>
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
