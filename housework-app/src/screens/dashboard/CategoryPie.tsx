import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { categoryChipColor, categoryEmoji } from '../../lib/categoryStyle'
import { categoryColor, ink } from '../../lib/chartColors'
import { CHORE_CATEGORIES, type ChoreCategory } from '../../types'

interface Props {
  totals: Record<ChoreCategory, number>
  isDark: boolean
}

/**
 * マネーフォワード風: 中央が空いたドーナツ（カテゴリ名のみをセグメントに
 * 直接ラベル）＋ その下にアイコン・カテゴリ名・🍀合計・％・シェブロンの
 * リスト。ドーナツの穴には世帯合計を表示する。
 */
export function CategoryPie({ totals, isDark }: Props) {
  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0)
  const slices = CHORE_CATEGORIES.map((cat, i) => ({
    name: cat,
    value: totals[cat] ?? 0,
    color: categoryColor(i, isDark),
    index: i,
  })).filter((s) => s.value > 0)

  return (
    <div className="mt-3 rounded-[28px] border-4 border-white bg-[#fffdf5] p-[18px] shadow-[0_6px_0_rgba(120,140,90,0.28)] dark:border-neutral-700 dark:bg-neutral-900">
      <h3 className="mb-2 text-[13.5px] font-bold text-[#8a9470] dark:text-neutral-400">
        カテゴリ別内訳
      </h3>
      {grandTotal === 0 ? (
        <p className="py-6 text-center text-sm text-[#a8ad92] dark:text-neutral-500">
          この期間の記録はまだありません
        </p>
      ) : (
        <>
          <div className="relative h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="48%"
                  outerRadius="80%"
                  paddingAngle={2}
                  label={({ name }) => name}
                  labelLine={false}
                  style={{ fontSize: 11, fontWeight: 700 }}
                >
                  {slices.map((s) => (
                    <Cell key={s.name} fill={s.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    `🍀${value}（${Math.round((Number(value) / grandTotal) * 100)}%）`,
                    name,
                  ]}
                  contentStyle={{
                    background: isDark ? '#1a1a19' : '#fcfcfb',
                    border: 'none',
                    borderRadius: 8,
                    color: ink('primary', isDark),
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* ドーナツの穴に世帯合計を表示（マネーフォワードの中心が空いた構図） */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[11px] font-bold text-[#a8ad92] dark:text-neutral-500">
                合計
              </span>
              <span className="text-[15px] font-bold text-[#4e4133] dark:text-white">
                🍀{grandTotal.toLocaleString('ja-JP')}
              </span>
            </div>
          </div>

          <ul className="mt-2 flex flex-col divide-y divide-[#f0ede4] dark:divide-neutral-800">
            {slices.map((s) => {
              const pct = Math.round((s.value / grandTotal) * 100)
              return (
                <li key={s.name} className="flex items-center gap-3 py-2.5">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-base"
                    style={{
                      backgroundColor: categoryChipColor(s.name, isDark),
                      borderColor: s.color,
                    }}
                  >
                    {categoryEmoji(s.name)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold text-[#4e4133] dark:text-white">
                    {s.name}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[13.5px] font-bold text-[#4e4133] dark:text-white">
                      🍀{s.value.toLocaleString('ja-JP')}
                    </span>
                    <span className="block text-[11px] text-[#a8ad92] dark:text-neutral-500">
                      {pct}%
                    </span>
                  </span>
                  <span className="shrink-0 text-[#c3ab94] dark:text-neutral-600">›</span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
