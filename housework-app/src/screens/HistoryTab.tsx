import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useHousehold } from '../contexts/HouseholdContext'
import { useChores } from '../hooks/useChores'
import { useAllLogs, useRecentLogs } from '../hooks/useLogs'
import { deleteLog, updateLog } from '../lib/logService'
import { buildLogsCsv, downloadCsv } from '../lib/csvExport'
import { categoryChipColor, categoryEmoji } from '../lib/categoryStyle'
import { dayKey, formatDayHeading, formatTime, toLocalInputValue } from '../lib/date'
import { memberColor } from '../lib/chartColors'
import { useIsDark } from '../lib/theme'
import type { Chore, ChoreLog } from '../types'

interface DayGroup {
  key: string
  headingMs: number
  logs: ChoreLog[]
}

/** Groups day-descending logs into contiguous per-day sections. */
function groupByDay(logs: ChoreLog[]): DayGroup[] {
  const groups: DayGroup[] = []
  for (const log of logs) {
    const key = dayKey(log.doneAt)
    const last = groups[groups.length - 1]
    if (last && last.key === key) {
      last.logs.push(log)
    } else {
      groups.push({ key, headingMs: log.doneAt, logs: [log] })
    }
  }
  return groups
}

interface LogEditPatch {
  doneAt: number
  minutes: number
  choreId: string
  choreName: string
  category: Chore['category']
  loadFactor: number
}

function EditSheet({
  log,
  chores,
  onClose,
  onSave,
  onDelete,
}: {
  log: ChoreLog
  chores: Chore[]
  onClose: () => void
  onSave: (patch: LogEditPatch) => void
  onDelete: () => void
}) {
  const [value, setValue] = useState(toLocalInputValue(log.doneAt))
  const [minutes, setMinutes] = useState(String(log.minutes))
  const [choreId, setChoreId] = useState(log.choreId)

  // The chore recorded on this log may since have been deleted from the
  // household's chore list — keep it selectable so the <select> always has
  // a matching option even if it's no longer in `chores`.
  const options = chores.some((c) => c.id === log.choreId)
    ? chores
    : [
        {
          id: log.choreId,
          name: log.choreName,
          category: log.category,
          minutes: log.minutes,
          loadFactor: log.loadFactor,
          isFavorite: false,
          order: -1,
          createdAt: 0,
        } as Chore,
        ...chores,
      ]
  const selected = options.find((c) => c.id === choreId) ?? options[0]

  const minutesNum = Number(minutes)
  const minutesValid = minutes.trim() !== '' && Number.isFinite(minutesNum) && minutesNum > 0

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="w-full rounded-t-2xl bg-white p-5 pb-8 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">
          {log.choreName}
        </h3>
        <label className="mb-4 flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-300">
          家事
          <select
            value={choreId}
            onChange={(e) => {
              const next = options.find((c) => c.id === e.target.value)
              setChoreId(e.target.value)
              if (next) setMinutes(String(next.minutes))
            }}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          >
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {categoryEmoji(c.category)} {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="mb-4 flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-300">
          記録日時
          <input
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
        </label>
        <label className="mb-4 flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-300">
          かかった時間（分）
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!minutesValid}
            onClick={() => {
              const ms = new Date(value).getTime()
              if (!Number.isNaN(ms) && minutesValid) {
                onSave({
                  doneAt: ms,
                  minutes: minutesNum,
                  choreId: selected.id,
                  choreName: selected.name,
                  category: selected.category,
                  loadFactor: selected.loadFactor,
                })
              }
              onClose()
            }}
            className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white disabled:opacity-50 active:bg-blue-700"
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => {
              onDelete()
              onClose()
            }}
            className="flex-1 rounded-xl bg-red-50 py-3 font-semibold text-red-600 active:bg-red-100 dark:bg-red-950 dark:text-red-400"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  )
}

export function HistoryTab() {
  const { user } = useAuth()
  const { household, myNickname, partnerUid } = useHousehold()
  const isDark = useIsDark()
  const { logs, loading } = useRecentLogs(household?.id ?? null)
  const { logs: allLogs } = useAllLogs(household?.id ?? null)
  const { chores } = useChores(household?.id ?? null)
  const [editing, setEditing] = useState<ChoreLog | null>(null)

  if (!household || !user) return null

  const partnerNickname = partnerUid ? household.nicknames?.[partnerUid] : 'パートナー'

  function handleExportCsv() {
    if (!household) return
    const csv = buildLogsCsv(allLogs, household.nicknames ?? {})
    const today = new Date().toISOString().slice(0, 10)
    // Filename stays ASCII (content is Japanese) — Chromium silently drops a
    // blob: download's filename+extension entirely when it contains
    // non-ASCII characters, falling back to a bare "download" with no
    // extension.
    downloadCsv(`housework-log_${today}.csv`, csv)
  }

  return (
    <div className="min-h-full px-4 pb-28 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">🕒 履歴</h1>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={allLogs.length === 0}
          className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-blue-600 shadow-sm ring-1 ring-black/5 disabled:opacity-40 dark:bg-neutral-900 dark:text-blue-400 dark:ring-white/10"
        >
          CSVで書き出す
        </button>
      </div>

      {loading && <p className="text-sm text-neutral-400">読み込み中...</p>}
      {!loading && logs.length === 0 && (
        <div className="mt-6 rounded-2xl bg-white/70 p-8 text-center shadow-sm ring-1 ring-black/5 dark:bg-neutral-900/70 dark:ring-white/10">
          <p className="text-3xl">📝</p>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            まだ記録がありません。
            <br />
            ホームから家事をタップすると、ここに記録が並びます。
          </p>
        </div>
      )}

      <div className="flex flex-col gap-5">
        {groupByDay(logs).map((group) => (
          <section key={group.key}>
            <div className="mb-2 flex items-center gap-3">
              <h2 className="text-sm font-bold text-neutral-500 dark:text-neutral-400">
                {formatDayHeading(group.headingMs)}
              </h2>
              <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
              <span className="text-xs text-neutral-400">{group.logs.length}件</span>
            </div>
            <div className="flex flex-col gap-2">
              {group.logs.map((log) => {
                const isSelf = log.userId === user.uid
                const who = isSelf ? myNickname || 'あなた' : partnerNickname || 'パートナー'
                return (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() => setEditing(log)}
                    className="flex items-center gap-3 rounded-2xl bg-white px-3 py-3 text-left shadow-sm ring-1 ring-black/5 active:bg-neutral-50 dark:bg-neutral-900 dark:ring-white/10 dark:active:bg-neutral-800"
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
                      style={{ backgroundColor: categoryChipColor(log.category, isDark) }}
                    >
                      {categoryEmoji(log.category)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-neutral-900 dark:text-white">
                        {log.choreName}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-400">
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: memberColor(isSelf, isDark) }}
                        />
                        {who} ・ {formatTime(log.doneAt)} ・ {log.minutes}分
                      </p>
                    </div>
                    <span className="shrink-0 text-neutral-300">›</span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {editing && (
        <EditSheet
          log={editing}
          chores={chores}
          onClose={() => setEditing(null)}
          onSave={(patch) => updateLog(household.id, editing.id, patch)}
          onDelete={() => deleteLog(household.id, editing.id)}
        />
      )}
    </div>
  )
}
