import { arrayUnion, doc, runTransaction } from 'firebase/firestore'
import { db } from './firebase'

export class NotEnoughCloversError extends Error {}
export class AllTipsUnlockedError extends Error {}

/**
 * Spends `cost` clovers and unlocks one tip.
 *
 * The winner is chosen *inside* the transaction from `shuffledTipIds` (the
 * caller shuffles, this picks the first entry not already unlocked). Doing the
 * draw here rather than on the client means two partners spinning at the same
 * moment can't land on the same tip and pay twice for it — the second
 * transaction re-reads the updated document and picks the next one.
 *
 * `earned` is the spender's view of lifetime clovers earned (derived from
 * their logs). The balance check runs against the freshly-read `cloversSpent`,
 * so a concurrent spin that drained the balance makes this one fail rather
 * than overdraw.
 *
 * Returns the id of the tip that was unlocked.
 */
export async function spendAndUnlock(
  householdId: string,
  shuffledTipIds: string[],
  cost: number,
  earned: number,
): Promise<string> {
  const ref = doc(db, 'households', householdId)
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) throw new Error('世帯が見つかりませんでした。')

    const data = snap.data()
    const unlocked: string[] = data.tipsUnlocked ?? []
    const spent: number = data.cloversSpent ?? 0

    const winner = shuffledTipIds.find((id) => !unlocked.includes(id))
    if (!winner) throw new AllTipsUnlockedError()
    if (earned - spent < cost) throw new NotEnoughCloversError()

    tx.update(ref, {
      cloversSpent: spent + cost,
      tipsUnlocked: arrayUnion(winner),
    })
    return winner
  })
}
