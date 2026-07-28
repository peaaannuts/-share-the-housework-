import type { ChoreLog } from '../types'

function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatDateTime(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatYearMonth(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * 年月ごとに集計しやすいよう「年月」列を独立して持たせている
 * （例: 家事別の月次累計時間を出したい、という用途向け）。
 */
export function buildLogsCsv(logs: ChoreLog[], nicknames: Record<string, string>): string {
  const header = ['日時', '年月', '実施者', '家事名', 'カテゴリ', '所要時間（分）', '負荷係数', 'スコア']
  const rows = [...logs]
    .sort((a, b) => a.doneAt - b.doneAt)
    .map((log) => [
      formatDateTime(log.doneAt),
      formatYearMonth(log.doneAt),
      nicknames[log.userId] ?? log.userId,
      log.choreName,
      log.category,
      String(log.minutes),
      String(log.loadFactor),
      String(log.score),
    ])
  return [header, ...rows].map((cols) => cols.map(escapeCsvField).join(',')).join('\r\n')
}

/** Excel（特に日本語Windows）でも文字化けしないよう UTF-8 BOM を付与する。 */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
