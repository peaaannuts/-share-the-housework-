import type { ChoreLog } from '../types'

export interface ChoreStat {
  choreId: string
  choreName: string
  category: string
  selfCount: number
  selfMinutes: number
  partnerCount: number
  partnerMinutes: number
}

/**
 * ログを家事ごとに集計し、自分/パートナーの実施回数・分数を出す。
 * 合計時間の多い家事順にソートする。ChoreBreakdown（全期間累計）と
 * WeeklyBreakdown（今週）の両方から、対象ログの範囲だけ変えて呼ばれる。
 */
export function buildChoreStats(logs: ChoreLog[], selfUid: string): ChoreStat[] {
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
}
