import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ink, memberColor } from '../../lib/chartColors'

interface WeekPoint {
  label: string
  self: number
  partner: number
}

interface Props {
  data: WeekPoint[]
  selfLabel: string
  partnerLabel: string
  isDark: boolean
}

export function WeeklyTrend({ data, selfLabel, partnerLabel, isDark }: Props) {
  const selfColor = memberColor(true, isDark)
  const partnerColor = memberColor(false, isDark)
  const gridColor = ink('grid', isDark)
  const axisColor = ink('muted', isDark)

  return (
    <div className="mt-3 rounded-[28px] border-4 border-white bg-[#fffdf5] p-[18px] shadow-[0_6px_0_rgba(120,140,90,0.28)] dark:border-neutral-700 dark:bg-neutral-900">
      <h3 className="mb-2 text-[13.5px] font-bold text-[#8a9470] dark:text-neutral-400">
        週次推移
      </h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={gridColor} />
            <XAxis
              dataKey="label"
              tick={{ fill: axisColor, fontSize: 11 }}
              axisLine={{ stroke: gridColor }}
              tickLine={false}
            />
            <YAxis tick={{ fill: axisColor, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: isDark ? '#1a1a19' : '#fcfcfb',
                border: 'none',
                borderRadius: 8,
                color: ink('primary', isDark),
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: ink('secondary', isDark) }} />
            <Bar dataKey="self" name={selfLabel || 'あなた'} fill={selfColor} radius={[4, 4, 0, 0]} maxBarSize={24} />
            <Bar dataKey="partner" name={partnerLabel} fill={partnerColor} radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
