import { useState } from 'react'
import { CHORE_CATEGORIES, type Chore, type ChoreCategory } from '../../types'

export interface ChoreFormValues {
  name: string
  minutes: number
  loadFactor: number
  category: ChoreCategory
  isFavorite: boolean
}

export function ChoreEditForm({
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  initial?: Chore
  onSave: (values: ChoreFormValues) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [minutes, setMinutes] = useState(initial?.minutes ?? 15)
  const [loadFactor, setLoadFactor] = useState(initial?.loadFactor ?? 1)
  const [category, setCategory] = useState<ChoreCategory>(initial?.category ?? 'その他')
  const [isFavorite, setIsFavorite] = useState(initial?.isFavorite ?? false)

  return (
    <div className="sheet-overlay z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="sheet-panel max-h-[85dvh] w-full rounded-t-2xl bg-white p-5 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold text-neutral-900 dark:text-white">
          {initial ? '家事を編集' : '家事を追加'}
        </h3>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-300">
            名前
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-300">
            標準所要時間（分）
            <input
              type="number"
              min={1}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-300">
            負荷係数（大変さの重み）
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={loadFactor}
              onChange={(e) => setLoadFactor(Number(e.target.value))}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-300">
            カテゴリ
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ChoreCategory)}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
            >
              {CHORE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="h-4 w-4"
            />
            ホーム画面のお気に入りに表示する
          </label>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (!name.trim()) return
              onSave({ name: name.trim(), minutes, loadFactor, category, isFavorite })
              onClose()
            }}
            className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white active:bg-blue-700"
          >
            保存
          </button>
          {onDelete && (
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
          )}
        </div>
      </div>
    </div>
  )
}
