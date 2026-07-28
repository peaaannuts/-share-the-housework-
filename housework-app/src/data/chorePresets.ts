import type { ChoreCategory } from '../types'

export interface ChorePreset {
  name: string
  minutes: number
  loadFactor: number
  category: ChoreCategory
  isFavorite: boolean
}

// Initial preset chores seeded into a new household. minutes = standard
// time in minutes, loadFactor = subjective weight ("大変さ"); score is
// minutes × loadFactor. Includes "名もなき家事" per the requirements doc.
export const CHORE_PRESETS: ChorePreset[] = [
  { name: '夕食作り', minutes: 40, loadFactor: 1.5, category: '料理', isFavorite: true },
  { name: '朝食作り', minutes: 15, loadFactor: 1, category: '料理', isFavorite: true },
  { name: '献立を決める', minutes: 10, loadFactor: 1.2, category: '料理', isFavorite: false },
  { name: '食器洗い', minutes: 15, loadFactor: 1, category: '料理', isFavorite: true },
  { name: '洗濯機を回す', minutes: 5, loadFactor: 0.8, category: '洗濯', isFavorite: true },
  { name: '洗濯物を干す', minutes: 10, loadFactor: 1, category: '洗濯', isFavorite: true },
  { name: '洗濯物を畳む・しまう', minutes: 15, loadFactor: 1, category: '洗濯', isFavorite: false },
  { name: '掃除機がけ', minutes: 15, loadFactor: 1, category: '掃除', isFavorite: true },
  { name: 'お風呂掃除', minutes: 10, loadFactor: 1.2, category: '掃除', isFavorite: true },
  { name: 'トイレ掃除', minutes: 10, loadFactor: 1.2, category: '掃除', isFavorite: false },
  { name: 'ゴミ出し', minutes: 5, loadFactor: 0.8, category: 'ゴミ出し', isFavorite: true },
  { name: 'ゴミをまとめる', minutes: 5, loadFactor: 0.8, category: 'ゴミ出し', isFavorite: false },
  { name: '買い出し', minutes: 30, loadFactor: 1.3, category: '買い物', isFavorite: true },
  { name: '日用品の在庫管理・補充', minutes: 10, loadFactor: 1.2, category: '買い物', isFavorite: false },
]
