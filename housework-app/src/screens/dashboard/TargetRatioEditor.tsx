import { useState } from 'react'

interface Props {
  target: number
  selfLabel: string
  partnerLabel: string
  onChange: (value: number) => void
}

export function TargetRatioEditor({ target, selfLabel, partnerLabel, onChange }: Props) {
  const [value, setValue] = useState(target)

  return (
    <div className="mt-3 rounded-[28px] border-4 border-white bg-[#fffdf5] p-[18px] shadow-[0_6px_0_rgba(120,140,90,0.28)] dark:border-neutral-700 dark:bg-neutral-900">
      <h3 className="mb-1 text-[13.5px] font-bold text-[#8a9470] dark:text-neutral-400">
        自分たちの目標比率
      </h3>
      <p className="mb-3 text-xs text-[#a8ad92] dark:text-neutral-500">
        2人で話し合って決めた比率です。50:50である必要はありません。
      </p>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        onPointerUp={() => onChange(value)}
        className="w-full accent-blue-600"
      />
      <p className="mt-2 text-center text-sm font-bold text-[#4e4133] dark:text-neutral-200">
        {selfLabel || 'あなた'} {value} : {100 - value} {partnerLabel}
      </p>
    </div>
  )
}
