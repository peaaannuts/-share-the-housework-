import type { ChoreCategory } from '../types'

const EMOJI: Record<ChoreCategory, string> = {
  料理: '🍳',
  洗濯: '🧺',
  掃除: '🧹',
  ゴミ出し: '🗑️',
  買い物: '🛒',
  その他: '✨',
}

// Soft pastel chip backgrounds per category — used behind the emoji to add
// warmth and make the one-tap buttons scannable. Dark mode uses one subtle
// tone instead (pastels wash out on a dark surface).
const CHIP_LIGHT: Record<ChoreCategory, string> = {
  料理: '#fff1e6',
  洗濯: '#e8f2ff',
  掃除: '#e7f7ee',
  ゴミ出し: '#f1ecfe',
  買い物: '#fdecf4',
  その他: '#f1efea',
}

const CHIP_DARK = 'rgba(148, 163, 184, 0.16)'

export function categoryEmoji(cat: ChoreCategory): string {
  return EMOJI[cat] ?? '✨'
}

export function categoryChipColor(cat: ChoreCategory, isDark: boolean): string {
  return isDark ? CHIP_DARK : (CHIP_LIGHT[cat] ?? CHIP_LIGHT['その他'])
}
