import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { categoryColor, ink } from '../../lib/chartColors'
import { CHORE_CATEGORIES, type ChoreCategory } from '../../types'

interface Props {
  totals: Record<ChoreCategory, number>
  isDark: boolean
}

export function CategoryPie({ totals, isDark }: Props) {
  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0)
  const slices = CHORE_CATEGORIES.map((cat, i) => ({
    name: cat,
    value: totals[cat] ?? 0,
    color: categoryColor(i, isDark),
  })).filter((s) => s.value > 0)

  return (
    <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
      <h3 className="mb-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
        カテゴリ別内訳
      </h3>
      {grandTotal === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-400">この期間の記録はまだありません</p>
      ) : (
        <>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="45%"
                  outerRadius="80%"
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
                  labelLine={false}
                >
                  {slices.map((s) => (
                    <Cell key={s.name} fill={s.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [
                    `${Math.round((Number(value) / grandTotal) * 100)}%`,
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
                <Legend wrapperStyle={{ fontSize: 12, color: ink('secondary', isDark) }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 flex flex-col gap-1 text-xs text-neutral-500 dark:text-neutral-400">
            {slices.map((s) => (
              <li key={s.name} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.name}
                </span>
                <span>{Math.round((s.value / grandTotal) * 100)}%</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
