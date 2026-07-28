import { collection, deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { Chore, ChoreCategory } from '../types'

export function logsCollection(householdId: string) {
  return collection(db, 'households', householdId, 'logs')
}

/**
 * Records a completed chore. Score is computed and frozen at record time
 * so later edits to the chore master never change past totals.
 *
 * Deliberately synchronous / fire-and-forget: setDoc()'s promise only
 * resolves once the server acknowledges the write, but the one-tap
 * recording flow (and the "works offline" requirement) needs the id and
 * the undo toast immediately. The doc ref/id is generated client-side, and
 * Firestore's local cache + offline queue take it from there.
 */
export function addLog(householdId: string, chore: Chore, userId: string, doneAt = Date.now()): string {
  const ref = doc(logsCollection(householdId))
  const score = chore.minutes * chore.loadFactor
  setDoc(ref, {
    choreId: chore.id,
    choreName: chore.name,
    category: chore.category,
    userId,
    doneAt,
    minutes: chore.minutes,
    loadFactor: chore.loadFactor,
    score,
  }).catch((err) => console.error('failed to save log', err))
  return ref.id
}

export async function deleteLog(householdId: string, logId: string) {
  await deleteDoc(doc(db, 'households', householdId, 'logs', logId))
}

/**
 * Edits a past record's time, time-taken, and/or which chore it was
 * (e.g. correcting a mis-tap). loadFactor comes from whichever chore is
 * selected at save time, so score is always recomputed from the edited
 * minutes and that chore's loadFactor.
 */
export async function updateLog(
  householdId: string,
  logId: string,
  patch: {
    doneAt: number
    minutes: number
    choreId: string
    choreName: string
    category: ChoreCategory
    loadFactor: number
  },
) {
  await updateDoc(doc(db, 'households', householdId, 'logs', logId), {
    doneAt: patch.doneAt,
    minutes: patch.minutes,
    choreId: patch.choreId,
    choreName: patch.choreName,
    category: patch.category,
    loadFactor: patch.loadFactor,
    score: patch.minutes * patch.loadFactor,
  })
}
