import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import type { ChoreCategory } from '../types'

export interface ChoreInput {
  name: string
  minutes: number
  loadFactor: number
  category: ChoreCategory
  isFavorite: boolean
  order: number
}

export function choresCollection(householdId: string) {
  return collection(db, 'households', householdId, 'chores')
}

export async function addChore(householdId: string, input: ChoreInput) {
  await addDoc(choresCollection(householdId), {
    ...input,
    createdAt: serverTimestamp(),
  })
}

export async function updateChore(
  householdId: string,
  choreId: string,
  patch: Partial<ChoreInput>,
) {
  await updateDoc(doc(db, 'households', householdId, 'chores', choreId), patch)
}

export async function deleteChore(householdId: string, choreId: string) {
  await deleteDoc(doc(db, 'households', householdId, 'chores', choreId))
}
